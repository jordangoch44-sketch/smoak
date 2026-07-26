/**
 * Live platform totals + traffic for the admin executive snapshot.
 * Reads real Supabase tables as the signed-in admin (RLS: is_admin).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateCatalogMonthlyEarningsFromFlags } from "@/lib/admin-live-catalog-earnings";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import type {
  AdminLiveEarnings,
  AdminPlatformPulse,
  AdminTrafficWeek,
  AdminWeeklyCount,
} from "@/types/admin-platform-pulse";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function percentChange(current: number, baseline: number): number | null {
  if (baseline <= 0) return null;
  return ((current - baseline) / baseline) * 100;
}

function formatPeriodLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

async function countRoles(
  supabase: SupabaseClient,
  role: "specialist" | "client",
  createdBefore?: string
): Promise<number | null> {
  let query = supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", role);
  if (createdBefore) {
    query = query.lte("created_at", createdBefore);
  }
  const { count, error } = await query;
  if (error) {
    console.warn("[SMOAC admin] role count failed:", error.message);
    return null;
  }
  return count ?? 0;
}

/** Live specialists = approved profiles on the public catalog. */
async function countApprovedSpecialists(
  supabase: SupabaseClient,
  createdBefore?: string
): Promise<number | null> {
  let query = supabase
    .from("specialist_profiles")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");
  if (createdBefore) {
    query = query.lte("created_at", createdBefore);
  }
  const { count, error } = await query;
  if (error) {
    console.warn("[SMOAC admin] specialist count failed:", error.message);
    return null;
  }
  return count ?? 0;
}

function toWeeklyCount(
  total: number | null,
  weekAgoTotal: number | null
): AdminWeeklyCount | null {
  if (total == null || weekAgoTotal == null) return null;
  return {
    total,
    weekAgoTotal,
    delta: total - weekAgoTotal,
    percentChange: percentChange(total, weekAgoTotal),
  };
}

async function fetchWeeklySpecialistCount(
  supabase: SupabaseClient,
  weekAgoIso: string
): Promise<AdminWeeklyCount | null> {
  const [total, weekAgoTotal] = await Promise.all([
    countApprovedSpecialists(supabase),
    countApprovedSpecialists(supabase, weekAgoIso),
  ]);
  return toWeeklyCount(total, weekAgoTotal);
}

async function fetchWeeklyClientCount(
  supabase: SupabaseClient,
  weekAgoIso: string
): Promise<AdminWeeklyCount | null> {
  const [total, weekAgoTotal] = await Promise.all([
    countRoles(supabase, "client"),
    countRoles(supabase, "client", weekAgoIso),
  ]);
  return toWeeklyCount(total, weekAgoTotal);
}

async function countPendingApplications(
  supabase: SupabaseClient
): Promise<number | null> {
  const [specialists, clients] = await Promise.all([
    supabase
      .from("specialist_applications")
      .select("*", { count: "exact", head: true })
      .eq("profile_status", "PENDING_APPROVAL"),
    supabase
      .from("client_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING"),
  ]);

  if (specialists.error) {
    console.warn(
      "[SMOAC admin] pending specialist apps failed:",
      specialists.error.message
    );
  }
  if (clients.error) {
    console.warn(
      "[SMOAC admin] pending client apps failed:",
      clients.error.message
    );
  }

  if (specialists.error && clients.error) return null;
  return (specialists.count ?? 0) + (clients.count ?? 0);
}

async function fetchLiveEarnings(
  supabase: SupabaseClient
): Promise<AdminLiveEarnings | null> {
  /* Prefer real Stripe MRR when keys are configured */
  try {
    const { fetchStripeMrrCents } = await import(
      "@/lib/stripe/sync-subscription"
    );
    const stripeMrr = await fetchStripeMrrCents();
    if (stripeMrr && stripeMrr.dataSource === "stripe") {
      return {
        paidSubscriberCount: stripeMrr.payingCount,
        subscriberRevenueCents: stripeMrr.mrrCents,
        adRevenueCents: 0,
        periodLabel: formatPeriodLabel(new Date()),
      };
    }
  } catch (err) {
    console.warn("[SMOAC admin] Stripe MRR fetch failed:", err);
  }

  const { data, error } = await supabase
    .from("specialist_profiles")
    .select("is_premium, featured, sponsored, top_ranked")
    .eq("status", "approved");

  if (error) {
    console.warn("[SMOAC admin] earnings flags failed:", error.message);
    return null;
  }

  const estimated = estimateCatalogMonthlyEarningsFromFlags(
    (data ?? []).map((row) => ({
      isPremium: Boolean(row.is_premium),
      featured: Boolean(row.featured),
      sponsored: Boolean(row.sponsored),
      topRanked: Boolean(row.top_ranked),
    }))
  );

  return {
    ...estimated,
    periodLabel: formatPeriodLabel(new Date()),
  };
}

function sourceLabel(visit: {
  utm_source: string | null;
  referrer_host: string | null;
}): string {
  if (visit.utm_source) return visit.utm_source;
  if (visit.referrer_host) return visit.referrer_host;
  return "direct";
}

async function fetchTrafficWeek(
  supabase: SupabaseClient,
  now: number
): Promise<AdminTrafficWeek | null> {
  const twoWeeksAgoIso = new Date(now - 2 * WEEK_MS).toISOString();
  const { data, error } = await supabase
    .from("site_visits")
    .select("occurred_at, visitor_key, utm_source, referrer_host")
    .gte("occurred_at", twoWeeksAgoIso)
    .limit(20000);

  if (error) {
    /* Table may not be migrated yet — traffic stays unavailable, totals still load */
    console.warn("[SMOAC admin] site_visits read failed:", error.message);
    return null;
  }

  const weekAgo = now - WEEK_MS;
  let views = 0;
  let prevViews = 0;
  const visitors = new Set<string>();
  const prevVisitors = new Set<string>();
  const sourceViews = new Map<string, number>();

  for (const visit of data ?? []) {
    const at = new Date(visit.occurred_at as string).getTime();
    if (at >= weekAgo) {
      views += 1;
      visitors.add(visit.visitor_key as string);
      const label = sourceLabel(
        visit as { utm_source: string | null; referrer_host: string | null }
      );
      sourceViews.set(label, (sourceViews.get(label) ?? 0) + 1);
    } else {
      prevViews += 1;
      prevVisitors.add(visit.visitor_key as string);
    }
  }

  const topSources = [...sourceViews.entries()]
    .map(([source, count]) => ({ source, views: count }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 3);

  return {
    views,
    uniqueVisitors: visitors.size,
    prevViews,
    prevUniqueVisitors: prevVisitors.size,
    viewsPercentChange: percentChange(views, prevViews),
    topSources,
  };
}

const EMPTY_WEEKLY: AdminWeeklyCount = {
  total: 0,
  weekAgoTotal: 0,
  delta: 0,
  percentChange: null,
};

const UNAVAILABLE: AdminPlatformPulse = {
  dataSource: "unavailable",
  specialists: EMPTY_WEEKLY,
  clients: EMPTY_WEEKLY,
  pendingApplications: 0,
  traffic: null,
  earnings: null,
};

export async function fetchAdminPlatformPulse(): Promise<AdminPlatformPulse> {
  if (!isMarketplaceSupabaseActive()) return UNAVAILABLE;
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return UNAVAILABLE;

  const now = Date.now();
  const weekAgoIso = new Date(now - WEEK_MS).toISOString();

  const [specialists, clients, pendingApplications, traffic, earnings] =
    await Promise.all([
      fetchWeeklySpecialistCount(supabase, weekAgoIso),
      fetchWeeklyClientCount(supabase, weekAgoIso),
      countPendingApplications(supabase),
      fetchTrafficWeek(supabase, now),
      fetchLiveEarnings(supabase),
    ]);

  if (
    !specialists &&
    !clients &&
    pendingApplications == null &&
    !traffic &&
    !earnings
  ) {
    return UNAVAILABLE;
  }

  return {
    dataSource: "live",
    specialists: specialists ?? EMPTY_WEEKLY,
    clients: clients ?? EMPTY_WEEKLY,
    pendingApplications: pendingApplications ?? 0,
    traffic,
    earnings,
  };
}

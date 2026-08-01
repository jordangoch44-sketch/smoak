import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SPECIALIST_AD_ADDON_CATALOG,
  SPECIALIST_TIER_CATALOG,
} from "@/data/admin-specialist-billing-catalog";
import type {
  AdminEngagementWeek,
  AdminLiveEarnings,
  AdminPlatformPulse,
  AdminTrafficDeviceSplit,
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
  const periodLabel = formatPeriodLabel(new Date());

  /* Prefer live Stripe MRR (server-only — secret key) */
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
        periodLabel,
        source: "stripe",
      };
    }
  } catch (err) {
    console.warn("[SMOAC admin] Stripe MRR fetch failed:", err);
  }

  /* Fallback: specialist_billing rows synced from Stripe webhooks (not profile flags) */
  const { data, error } = await supabase
    .from("specialist_billing")
    .select("status, plan, active_addons")
    .in("status", ["active", "trialing"]);

  if (error) {
    console.warn("[SMOAC admin] billing table earnings failed:", error.message);
    return {
      paidSubscriberCount: 0,
      subscriberRevenueCents: 0,
      adRevenueCents: 0,
      periodLabel,
      source: "none",
    };
  }

  let paidSubscriberCount = 0;
  let subscriberRevenueCents = 0;
  let adRevenueCents = 0;

  for (const row of data ?? []) {
    const plan = String(row.plan ?? "free");
    if (plan === "premium" || plan === "platinum") {
      paidSubscriberCount += 1;
      subscriberRevenueCents +=
        plan === "platinum"
          ? SPECIALIST_TIER_CATALOG.platinum.monthlyCents
          : SPECIALIST_TIER_CATALOG.premium.monthlyCents;
    }
    const addons = Array.isArray(row.active_addons)
      ? (row.active_addons as string[])
      : [];
    for (const addon of addons) {
      if (addon === "boosted_profile") {
        adRevenueCents +=
          SPECIALIST_AD_ADDON_CATALOG.boosted_profile.monthlyCents;
      } else if (addon === "category_spotlight") {
        adRevenueCents +=
          SPECIALIST_AD_ADDON_CATALOG.category_spotlight.monthlyCents;
      } else if (addon === "homepage_spotlight") {
        adRevenueCents +=
          SPECIALIST_AD_ADDON_CATALOG.homepage_spotlight.monthlyCents;
      } else if (addon === "top_ranking_boost") {
        adRevenueCents +=
          SPECIALIST_AD_ADDON_CATALOG.top_ranking_boost.monthlyCents;
      }
    }
  }

  return {
    paidSubscriberCount,
    subscriberRevenueCents,
    adRevenueCents,
    periodLabel,
    source: "billing_table",
  };
}

function sourceLabel(visit: {
  utm_source: string | null;
  referrer_host: string | null;
}): string {
  if (visit.utm_source) return friendlyTrafficSource(visit.utm_source);
  if (visit.referrer_host) return friendlyTrafficSource(visit.referrer_host);
  return "Direct";
}

/** Normalize raw UTM / host strings into readable channel names. */
export function friendlyTrafficSource(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) return "Direct";

  if (
    value.includes("google") ||
    value === "www.google.com" ||
    value.endsWith(".google.com")
  ) {
    return "Google";
  }
  if (value.includes("instagram") || value.includes("ig.")) {
    return "Instagram";
  }
  if (
    value.includes("chatgpt") ||
    value.includes("openai") ||
    value.includes("chat.openai")
  ) {
    return "ChatGPT";
  }
  if (
    value === "x.com" ||
    value.includes("twitter") ||
    value === "t.co" ||
    value.endsWith(".x.com")
  ) {
    return "X";
  }
  if (value.includes("facebook") || value.includes("fb.")) {
    return "Facebook";
  }
  if (value.includes("tiktok")) return "TikTok";
  if (value.includes("youtube") || value.includes("youtu.be")) return "YouTube";
  if (value.includes("bing")) return "Bing";
  if (value.includes("linkedin")) return "LinkedIn";
  if (value === "direct") return "Direct";

  /* Strip www. for cleaner host display */
  return raw.replace(/^www\./i, "").slice(0, 40);
}

async function fetchTrafficWeek(
  supabase: SupabaseClient,
  now: number
): Promise<AdminTrafficWeek | null> {
  const twoWeeksAgoIso = new Date(now - 2 * WEEK_MS).toISOString();
  const { data, error } = await supabase
    .from("site_visits")
    .select(
      "occurred_at, visitor_key, utm_source, referrer_host, path, device, is_new_visitor"
    )
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
  let newVisitors = 0;
  const visitors = new Set<string>();
  const prevVisitors = new Set<string>();
  const sourceViews = new Map<string, number>();
  const pathViews = new Map<string, number>();
  const devices: AdminTrafficDeviceSplit = {
    mobile: 0,
    desktop: 0,
    unknown: 0,
  };

  for (const visit of data ?? []) {
    const at = new Date(visit.occurred_at as string).getTime();
    if (at >= weekAgo) {
      views += 1;
      visitors.add(visit.visitor_key as string);
      if (visit.is_new_visitor) newVisitors += 1;

      const label = sourceLabel(
        visit as { utm_source: string | null; referrer_host: string | null }
      );
      sourceViews.set(label, (sourceViews.get(label) ?? 0) + 1);

      const path = String(visit.path ?? "/").slice(0, 80) || "/";
      pathViews.set(path, (pathViews.get(path) ?? 0) + 1);

      const device = String(visit.device ?? "");
      if (device === "mobile") devices.mobile += 1;
      else if (device === "desktop") devices.desktop += 1;
      else devices.unknown += 1;
    } else {
      prevViews += 1;
      prevVisitors.add(visit.visitor_key as string);
    }
  }

  const viewTotal = Math.max(views, 1);
  const topSources = [...sourceViews.entries()]
    .map(([source, count]) => ({
      source,
      views: count,
      sharePercent: Math.round((count / viewTotal) * 1000) / 10,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const topPaths = [...pathViews.entries()]
    .map(([path, count]) => ({ path, views: count }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  return {
    views,
    uniqueVisitors: visitors.size,
    prevViews,
    prevUniqueVisitors: prevVisitors.size,
    viewsPercentChange: percentChange(views, prevViews),
    uniqueVisitorsPercentChange: percentChange(
      visitors.size,
      prevVisitors.size
    ),
    newVisitors,
    topSources,
    topPaths,
    devices,
  };
}

function surfaceLabel(raw: string | null): string {
  const key = (raw ?? "unknown").trim() || "unknown";
  const labels: Record<string, string> = {
    explore: "Explore",
    saved: "Saved",
    home_sponsored: "Home sponsored",
    home_new: "Home new",
    home_top50: "Home Top 50",
    profile_rail: "Profile rails",
    profile: "Profile",
    rankings: "Rankings",
    client_dashboard: "Client dashboard",
    unknown: "Unknown",
  };
  return labels[key] ?? key;
}

async function fetchEngagementWeek(
  supabase: SupabaseClient,
  now: number
): Promise<AdminEngagementWeek | null> {
  const twoWeeksAgoIso = new Date(now - 2 * WEEK_MS).toISOString();
  const { data, error } = await supabase
    .from("specialist_engagement_events")
    .select("occurred_at, event_type, surface")
    .gte("occurred_at", twoWeeksAgoIso)
    .limit(30000);

  if (error) {
    console.warn("[SMOAC admin] engagement read failed:", error.message);
    return null;
  }

  const weekAgo = now - WEEK_MS;
  let searchAppearances = 0;
  let prevSearchAppearances = 0;
  let contactClicks = 0;
  let bookingClicks = 0;
  const surfaceCounts = new Map<string, number>();

  for (const row of data ?? []) {
    const at = new Date(row.occurred_at as string).getTime();
    const type = String(row.event_type ?? "");
    const inCurrentWeek = at >= weekAgo;

    if (type === "search_appearance") {
      if (inCurrentWeek) {
        searchAppearances += 1;
        const label = surfaceLabel(row.surface as string | null);
        surfaceCounts.set(label, (surfaceCounts.get(label) ?? 0) + 1);
      } else {
        prevSearchAppearances += 1;
      }
    } else if (inCurrentWeek && type === "contact_click") {
      contactClicks += 1;
    } else if (inCurrentWeek && type === "booking_click") {
      bookingClicks += 1;
    }
  }

  const topSurfaces = [...surfaceCounts.entries()]
    .map(([surface, count]) => ({ surface, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    searchAppearances,
    contactClicks,
    bookingClicks,
    prevSearchAppearances,
    searchAppearancesPercentChange: percentChange(
      searchAppearances,
      prevSearchAppearances
    ),
    topSurfaces,
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
  engagement: null,
};

/** Build pulse from a Supabase client (browser admin session or server). */
export async function buildAdminPlatformPulse(
  supabase: SupabaseClient
): Promise<AdminPlatformPulse> {
  const now = Date.now();
  const weekAgoIso = new Date(now - WEEK_MS).toISOString();

  const [
    specialists,
    clients,
    pendingApplications,
    traffic,
    earnings,
    engagement,
  ] = await Promise.all([
    fetchWeeklySpecialistCount(supabase, weekAgoIso),
    fetchWeeklyClientCount(supabase, weekAgoIso),
    countPendingApplications(supabase),
    fetchTrafficWeek(supabase, now),
    fetchLiveEarnings(supabase),
    fetchEngagementWeek(supabase, now),
  ]);

  if (
    !specialists &&
    !clients &&
    pendingApplications == null &&
    !traffic &&
    !earnings &&
    !engagement
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
    engagement,
  };
}

/** @deprecated Prefer /api/admin/platform-pulse from the admin UI */
export async function fetchAdminPlatformPulse(): Promise<AdminPlatformPulse> {
  const { getMarketplaceAuthClient, isMarketplaceSupabaseActive } =
    await import("@/lib/auth/marketplace-auth");
  if (!isMarketplaceSupabaseActive()) return UNAVAILABLE;
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return UNAVAILABLE;
  return buildAdminPlatformPulse(supabase);
}

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
  AdminTrafficWindow,
  AdminTrafficWindowId,
  AdminWeeklyCount,
} from "@/types/admin-platform-pulse";
import { buildMarketplaceConversionFunnel } from "@/lib/admin-conversion-funnel-service";

export { smoacRevenueTotalCents } from "@/types/admin-platform-pulse";

const EMPTY_COLLECTED = {
  collectedThisWeekCents: 0,
  collectedPrevWeekCents: 0,
  collectedWeekSeriesCents: [] as number[],
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

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

  const stripeMod = await import("@/lib/stripe/sync-subscription").catch(
    (err) => {
      console.warn("[SMOAC admin] Stripe module load failed:", err);
      return null;
    }
  );

  const [collected, stripeMrr] = stripeMod
    ? await Promise.all([
        stripeMod.fetchStripeCollectedWeek().catch((err) => {
          console.warn("[SMOAC admin] Stripe collected-week fetch failed:", err);
          return null;
        }),
        stripeMod.fetchStripeMrrCents().catch((err) => {
          console.warn("[SMOAC admin] Stripe MRR fetch failed:", err);
          return null;
        }),
      ])
    : [null, null];

  const collectedFields = collected
    ? {
        collectedThisWeekCents: collected.thisWeekCents,
        collectedPrevWeekCents: collected.prevWeekCents,
        collectedWeekSeriesCents: collected.seriesCents,
      }
    : EMPTY_COLLECTED;

  if (stripeMrr && stripeMrr.dataSource === "stripe") {
    return {
      paidSubscriberCount: stripeMrr.payingCount,
      subscriberRevenueCents: stripeMrr.membershipCents,
      adRevenueCents: stripeMrr.addonCents,
      periodLabel,
      source: "stripe",
      ...collectedFields,
    };
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
      ...EMPTY_COLLECTED,
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
    ...collectedFields,
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

function buildTrafficWindow(
  visits: readonly {
    at: number;
    visitorKey: string;
    isNew: boolean;
  }[],
  now: number,
  days: number
): AdminTrafficWindow {
  const windowMs = days * DAY_MS;
  const currentStart = now - windowMs;
  const prevStart = now - 2 * windowMs;
  const dailyViews = Array.from({ length: days }, () => 0);
  const visitors = new Set<string>();
  const prevVisitors = new Set<string>();
  let views = 0;
  let prevViews = 0;
  let newVisitors = 0;

  for (const visit of visits) {
    if (visit.at >= currentStart) {
      views += 1;
      visitors.add(visit.visitorKey);
      if (visit.isNew) newVisitors += 1;
      const ageDays = Math.min(
        days - 1,
        Math.max(0, Math.floor((now - visit.at) / DAY_MS))
      );
      dailyViews[days - 1 - ageDays] += 1;
    } else if (visit.at >= prevStart) {
      prevViews += 1;
      prevVisitors.add(visit.visitorKey);
    }
  }

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
    dailyViews,
  };
}

async function fetchTrafficWeek(
  supabase: SupabaseClient,
  now: number
): Promise<AdminTrafficWeek | null> {
  const lookbackIso = new Date(now - 60 * DAY_MS).toISOString();
  const { data, error } = await supabase
    .from("site_visits")
    .select(
      "occurred_at, visitor_key, utm_source, referrer_host, path, device, is_new_visitor"
    )
    .gte("occurred_at", lookbackIso)
    .limit(50000);

  if (error) {
    /* Table may not be migrated yet — traffic stays unavailable, totals still load */
    console.warn("[SMOAC admin] site_visits read failed:", error.message);
    return null;
  }

  const parsed = (data ?? []).map((visit) => ({
    at: new Date(visit.occurred_at as string).getTime(),
    visitorKey: String(visit.visitor_key ?? ""),
    isNew: Boolean(visit.is_new_visitor),
    utm_source: visit.utm_source as string | null,
    referrer_host: visit.referrer_host as string | null,
    path: String(visit.path ?? "/").slice(0, 80) || "/",
    device: String(visit.device ?? ""),
  }));

  const windows: Record<AdminTrafficWindowId, AdminTrafficWindow> = {
    "7d": buildTrafficWindow(parsed, now, 7),
    "14d": buildTrafficWindow(parsed, now, 14),
    "30d": buildTrafficWindow(parsed, now, 30),
  };
  const week = windows["7d"];
  const weekStart = now - WEEK_MS;
  const sourceViews = new Map<string, number>();
  const pathViews = new Map<string, number>();
  const devices: AdminTrafficDeviceSplit = {
    mobile: 0,
    desktop: 0,
    unknown: 0,
  };

  for (const visit of parsed) {
    if (visit.at < weekStart) continue;
    const label = sourceLabel({
      utm_source: visit.utm_source,
      referrer_host: visit.referrer_host,
    });
    sourceViews.set(label, (sourceViews.get(label) ?? 0) + 1);
    pathViews.set(visit.path, (pathViews.get(visit.path) ?? 0) + 1);
    if (visit.device === "mobile") devices.mobile += 1;
    else if (visit.device === "desktop") devices.desktop += 1;
    else devices.unknown += 1;
  }

  const viewTotal = Math.max(week.views, 1);
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
    ...week,
    topSources,
    topPaths,
    devices,
    windows,
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
    tools_calories: "Calorie tool",
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
  conversionFunnel: null,
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
    conversionFunnel,
  ] = await Promise.all([
    fetchWeeklySpecialistCount(supabase, weekAgoIso),
    fetchWeeklyClientCount(supabase, weekAgoIso),
    countPendingApplications(supabase),
    fetchTrafficWeek(supabase, now),
    fetchLiveEarnings(supabase),
    fetchEngagementWeek(supabase, now),
    buildMarketplaceConversionFunnel(supabase, "7d").catch((err) => {
      console.warn("[SMOAC admin] conversion funnel build failed:", err);
      return null;
    }),
  ]);

  if (
    !specialists &&
    !clients &&
    pendingApplications == null &&
    !traffic &&
    !earnings &&
    !engagement &&
    !conversionFunnel
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
    conversionFunnel,
  };
}

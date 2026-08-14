import type {
  AnalyticsMetricTrend,
  SpecialistGrowthInsight,
  SpecialistProfileAnalytics,
} from "@/types/specialist-analytics";

export interface SpecialistLiveAnalyticsBreakdown {
  topSurfaces: Array<{ surface: string; count: number }>;
  mobileViews: number;
  desktopViews: number;
  mobilePercent: number | null;
}

export interface SpecialistLiveWeeklyTrends {
  profileViews: AnalyticsMetricTrend;
  searchAppearances: AnalyticsMetricTrend;
  savedByClients: AnalyticsMetricTrend;
  contactClicks: AnalyticsMetricTrend;
  bookingClicks: AnalyticsMetricTrend;
}

export interface SpecialistLiveAnalyticsCounts {
  profileViews: number;
  savedByClients: number;
  searchAppearances: number;
  contactClicks: number;
  bookingClicks: number;
  breakdown: SpecialistLiveAnalyticsBreakdown;
  /** Week-over-week deltas for Pro metric tiles (this week vs prior week). */
  weeklyTrends?: SpecialistLiveWeeklyTrends;
}

export interface SpecialistLiveAnalyticsResponse {
  ok: boolean;
  counts?: SpecialistLiveAnalyticsCounts;
}

const WEEKLY_COMPARISON_LABEL = "vs last week";

export function buildWeekOverWeekTrend(
  current: number,
  previous: number
): AnalyticsMetricTrend {
  if (current === previous) {
    return {
      direction: "flat",
      percentChange: 0,
      comparisonLabel: WEEKLY_COMPARISON_LABEL,
    };
  }
  if (previous <= 0) {
    return {
      direction: current > 0 ? "up" : "flat",
      percentChange: current > 0 ? 100 : 0,
      comparisonLabel: WEEKLY_COMPARISON_LABEL,
    };
  }
  const raw = Math.round(((current - previous) / previous) * 100);
  return {
    direction: raw > 0 ? "up" : raw < 0 ? "down" : "flat",
    percentChange: Math.abs(raw),
    comparisonLabel: WEEKLY_COMPARISON_LABEL,
  };
}

function buildLiveGrowthInsights(
  live: SpecialistLiveAnalyticsCounts
): SpecialistGrowthInsight[] {
  const insights: SpecialistGrowthInsight[] = [];
  const top = live.breakdown.topSurfaces[0];

  if (top && top.count > 0) {
    insights.push({
      id: "top-surface",
      message: `Most of your search appearances came from ${top.surface} (${top.count} in the last 30 days).`,
    });
  }

  if (live.breakdown.mobilePercent != null) {
    const mobile = live.breakdown.mobilePercent;
    insights.push({
      id: "device-mix",
      message:
        mobile >= 55
          ? `${mobile}% of recent engagement is on mobile — keep photos and headlines sharp on small screens.`
          : `${100 - mobile}% of recent engagement is on desktop — your full profile layout matters.`,
    });
  }

  if (live.searchAppearances > 0 && live.profileViews > 0) {
    const rate = Math.round(
      (live.profileViews / live.searchAppearances) * 100
    );
    insights.push({
      id: "appearance-to-view",
      message: `About ${Math.min(rate, 100)}% of appearances turned into profile views — strengthen your card photo and specialties to lift that.`,
    });
  } else if (live.searchAppearances === 0 && live.profileViews === 0) {
    insights.push({
      id: "getting-started",
      message:
        "Complete your photos, specialties, and availability so clients can find and contact you.",
    });
  }

  if (live.contactClicks > 0 || live.bookingClicks > 0) {
    insights.push({
      id: "demand",
      message: `Clients showed interest ${live.contactClicks + live.bookingClicks} time${
        live.contactClicks + live.bookingClicks === 1 ? "" : "s"
      } (contact + booking intent). Fast replies help convert.`,
    });
  } else if (live.profileViews > 3) {
    insights.push({
      id: "convert-views",
      message:
        "People are viewing your profile — a clear Contact CTA and strong first photo help turn views into inquiries.",
    });
  }

  if (live.savedByClients > 0) {
    insights.push({
      id: "saves",
      message: `${live.savedByClients} client${live.savedByClients === 1 ? "" : "s"} saved your profile — they’re shortlisting you for later.`,
    });
  }

  const viewsTrend = live.weeklyTrends?.profileViews;
  if (viewsTrend && viewsTrend.direction === "up" && viewsTrend.percentChange > 0) {
    insights.unshift({
      id: "weekly-views",
      message: `Profile views are up ${viewsTrend.percentChange}% vs last week — keep momentum with fresh photos and fast replies.`,
    });
  } else if (
    viewsTrend &&
    viewsTrend.direction === "down" &&
    viewsTrend.percentChange > 0
  ) {
    insights.unshift({
      id: "weekly-views-down",
      message: `Profile views dipped ${viewsTrend.percentChange}% vs last week — boost visibility or refresh your card photo.`,
    });
  }

  return insights.slice(0, 5);
}

/** Patch honest base analytics with live Supabase counts + Pro insights. */
export function mergeLiveSpecialistAnalytics(
  base: SpecialistProfileAnalytics,
  live: SpecialistLiveAnalyticsCounts
): SpecialistProfileAnalytics {
  const byMetricId: Record<string, number> = {
    "profile-views": live.profileViews,
    "saved-by-clients": live.savedByClients,
    "search-appearances": live.searchAppearances,
    "contact-clicks": live.contactClicks,
    "booking-clicks": live.bookingClicks,
  };

  const byTrendId: Partial<Record<string, AnalyticsMetricTrend>> = live.weeklyTrends
    ? {
        "profile-views": live.weeklyTrends.profileViews,
        "search-appearances": live.weeklyTrends.searchAppearances,
        "saved-by-clients": live.weeklyTrends.savedByClients,
        "contact-clicks": live.weeklyTrends.contactClicks,
        "booking-clicks": live.weeklyTrends.bookingClicks,
      }
    : {};

  const liveInsights = buildLiveGrowthInsights(live);

  return {
    ...base,
    profileViews: live.profileViews,
    savedByClients: live.savedByClients,
    searchAppearances: live.searchAppearances,
    contactClicks: live.contactClicks,
    bookingClicks: live.bookingClicks,
    insightMessage: liveInsights[0]?.message ?? base.insightMessage,
    growthInsights:
      liveInsights.length > 0 ? liveInsights : base.growthInsights,
    discoveryBreakdown: {
      topSurfaces: live.breakdown.topSurfaces,
      mobilePercent: live.breakdown.mobilePercent,
    },
    coreMetrics: base.coreMetrics.map((metric) => {
      const value =
        metric.id in byMetricId ? byMetricId[metric.id] : metric.value;
      const trend = byTrendId[metric.id] ?? metric.trend;
      return { ...metric, value, trend };
    }),
  };
}

/** Fetch live specialist analytics from the server API (non-demo accounts only). */
export async function fetchSpecialistLiveAnalytics(): Promise<SpecialistLiveAnalyticsCounts | null> {
  try {
    const res = await fetch("/api/specialist/analytics", {
      credentials: "include",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as SpecialistLiveAnalyticsResponse;
    if (!body.ok || !body.counts) return null;
    return {
      profileViews: body.counts.profileViews ?? 0,
      savedByClients: body.counts.savedByClients ?? 0,
      searchAppearances: body.counts.searchAppearances ?? 0,
      contactClicks: body.counts.contactClicks ?? 0,
      bookingClicks: body.counts.bookingClicks ?? 0,
      breakdown: body.counts.breakdown ?? {
        topSurfaces: [],
        mobileViews: 0,
        desktopViews: 0,
        mobilePercent: null,
      },
      weeklyTrends: body.counts.weeklyTrends,
    };
  } catch {
    return null;
  }
}

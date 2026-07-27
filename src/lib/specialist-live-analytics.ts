import type {
  SpecialistGrowthInsight,
  SpecialistProfileAnalytics,
} from "@/types/specialist-analytics";

export interface SpecialistLiveAnalyticsBreakdown {
  topSurfaces: Array<{ surface: string; count: number }>;
  mobileViews: number;
  desktopViews: number;
  mobilePercent: number | null;
}

export interface SpecialistLiveAnalyticsCounts {
  profileViews: number;
  savedByClients: number;
  searchAppearances: number;
  contactClicks: number;
  bookingClicks: number;
  breakdown: SpecialistLiveAnalyticsBreakdown;
}

export interface SpecialistLiveAnalyticsResponse {
  ok: boolean;
  counts?: SpecialistLiveAnalyticsCounts;
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

  return insights.slice(0, 5);
}

function computeVisibilityScore(live: SpecialistLiveAnalyticsCounts): number {
  const raw =
    live.profileViews * 2 +
    live.searchAppearances +
    live.savedByClients * 8 +
    live.contactClicks * 12 +
    live.bookingClicks * 16;
  return Math.min(99, Math.round(Math.log10(raw + 1) * 40));
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

  const liveInsights = buildLiveGrowthInsights(live);
  const visibilityScore = computeVisibilityScore(live);

  return {
    ...base,
    profileViews: live.profileViews,
    savedByClients: live.savedByClients,
    searchAppearances: live.searchAppearances,
    contactClicks: live.contactClicks,
    bookingClicks: live.bookingClicks,
    visibilityScore,
    insightMessage:
      liveInsights[0]?.message ??
      base.insightMessage,
    growthInsights:
      liveInsights.length > 0 ? liveInsights : base.growthInsights,
    discoveryBreakdown: {
      topSurfaces: live.breakdown.topSurfaces,
      mobilePercent: live.breakdown.mobilePercent,
    },
    coreMetrics: base.coreMetrics.map((metric) =>
      metric.id in byMetricId
        ? { ...metric, value: byMetricId[metric.id] }
        : metric
    ),
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
    };
  } catch {
    return null;
  }
}

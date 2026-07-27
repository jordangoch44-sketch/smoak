import type { SpecialistProfileAnalytics } from "@/types/specialist-analytics";

export interface SpecialistLiveAnalyticsCounts {
  profileViews: number;
  savedByClients: number;
  searchAppearances: number;
  contactClicks: number;
  bookingClicks: number;
}

export interface SpecialistLiveAnalyticsResponse {
  ok: boolean;
  counts?: SpecialistLiveAnalyticsCounts;
}

/** Patch honest base analytics with live Supabase counts. */
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

  return {
    ...base,
    profileViews: live.profileViews,
    savedByClients: live.savedByClients,
    searchAppearances: live.searchAppearances,
    contactClicks: live.contactClicks,
    bookingClicks: live.bookingClicks,
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
    };
  } catch {
    return null;
  }
}

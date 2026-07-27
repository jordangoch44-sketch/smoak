import type { SpecialistProfileAnalytics } from "@/types/specialist-analytics";

export interface SpecialistLiveAnalyticsCounts {
  profileViews: number;
  savedByClients: number;
}

export interface SpecialistLiveAnalyticsResponse {
  ok: boolean;
  counts?: SpecialistLiveAnalyticsCounts;
}

/** Patch honest base analytics with live Supabase counts (profile views, saves). */
export function mergeLiveSpecialistAnalytics(
  base: SpecialistProfileAnalytics,
  live: SpecialistLiveAnalyticsCounts
): SpecialistProfileAnalytics {
  return {
    ...base,
    profileViews: live.profileViews,
    savedByClients: live.savedByClients,
    coreMetrics: base.coreMetrics.map((metric) => {
      if (metric.id === "profile-views") {
        return { ...metric, value: live.profileViews };
      }
      if (metric.id === "saved-by-clients") {
        return { ...metric, value: live.savedByClients };
      }
      return metric;
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
    return body.counts;
  } catch {
    return null;
  }
}

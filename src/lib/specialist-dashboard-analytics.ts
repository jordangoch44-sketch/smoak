import {
  DEMO_SPECIALIST_ANALYTICS,
  DEMO_SPECIALIST_ID,
  EMPTY_SPECIALIST_ANALYTICS,
} from "@/constants/specialist-dashboard-mock";
import type {
  SpecialistAnalyticsContext,
  SpecialistProfileAnalytics,
} from "@/types/specialist-analytics";

const DEMO_ANALYTICS_BY_SPECIALIST: Record<
  string,
  Omit<SpecialistProfileAnalytics, "profileCompletionPercent" | "rankingPosition">
> = {
  [DEMO_SPECIALIST_ID]: DEMO_SPECIALIST_ANALYTICS,
};

/** Merge demo metrics with live profile completion + ranking — replace with API fetch */
export function getSpecialistProfileAnalytics(
  specialistId: string,
  context: SpecialistAnalyticsContext
): SpecialistProfileAnalytics {
  const base = DEMO_ANALYTICS_BY_SPECIALIST[specialistId] ?? EMPTY_SPECIALIST_ANALYTICS;

  return {
    ...base,
    profileCompletionPercent: context.profileCompletionPercent,
    rankingPosition: context.rankingPosition,
  };
}

import {
  DEMO_SPECIALIST_ANALYTICS,
  DEMO_SPECIALIST_ID,
  DEV_SPECIALIST_DASHBOARD_ID,
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
  [DEV_SPECIALIST_DASHBOARD_ID]: DEMO_SPECIALIST_ANALYTICS,
};

/** Merge demo metrics with live profile completion + ranking — replace with API fetch */
export function getSpecialistProfileAnalytics(
  specialistId: string,
  context: SpecialistAnalyticsContext
): SpecialistProfileAnalytics {
  const useDemoMetrics = context.useDemoMetrics ?? true;
  const base =
    useDemoMetrics && DEMO_ANALYTICS_BY_SPECIALIST[specialistId]
      ? DEMO_ANALYTICS_BY_SPECIALIST[specialistId]
      : EMPTY_SPECIALIST_ANALYTICS;

  return {
    ...base,
    profileCompletionPercent: context.profileCompletionPercent,
    rankingPosition: context.rankingPosition,
  };
}

/**
 * Aspirational Pro dashboard preview for free specialists on the Plan tab.
 * Readable sample metrics (not blurred) so they can see what Pro feels like,
 * with their real profile completion % woven in.
 */
export function getSpecialistProPreviewAnalytics(
  context: Pick<
    SpecialistAnalyticsContext,
    "profileCompletionPercent" | "rankingPosition"
  >
): SpecialistProfileAnalytics {
  return {
    ...DEMO_SPECIALIST_ANALYTICS,
    periodLabel: "Example · last 30 days",
    profileCompletionPercent: context.profileCompletionPercent,
    rankingPosition: context.rankingPosition ?? 12,
    insightMessage:
      "With Pro you’d see which searches drive views, how you rank nearby, and where clients drop off — so you know what to improve next.",
  };
}

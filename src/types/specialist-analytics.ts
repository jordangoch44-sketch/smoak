/** Specialist profile performance metrics — wire to analytics API later */

export type AnalyticsMetricIconId =
  | "visibility"
  | "pulse"
  | "diamond"
  | "lightning"
  | "calendar"
  | "crown"
  | "ranking";

export type AnalyticsTrendDirection = "up" | "down" | "flat";

export interface AnalyticsMetricTrend {
  direction: AnalyticsTrendDirection;
  /** Absolute percent change vs prior period (display only) */
  percentChange: number;
  comparisonLabel: string;
}

export interface SpecialistAnalyticsMetric {
  id: string;
  label: string;
  value: number;
  icon: AnalyticsMetricIconId;
  trend: AnalyticsMetricTrend;
  /** Primary marketplace KPI — premium trend + glow treatment */
  isCoreKpi?: boolean;
  /** Fully frosted on free tier */
  lockOnFree?: boolean;
}

export interface SpecialistGrowthInsight {
  id: string;
  message: string;
}

export interface SpecialistProfileAnalytics {
  periodLabel: string;
  profileViews: number;
  searchAppearances: number;
  savedByClients: number;
  contactClicks: number;
  bookingClicks: number;
  profileCompletionPercent: number;
  rankingPosition: number | null;
  visibilityScore: number;
  insightMessage: string;
  coreMetrics: SpecialistAnalyticsMetric[];
  growthInsights: SpecialistGrowthInsight[];
}

export interface SpecialistAnalyticsContext {
  profileCompletionPercent: number;
  rankingPosition: number | null;
  /** When false, return zeroed metrics for real submitted profiles */
  useDemoMetrics?: boolean;
}

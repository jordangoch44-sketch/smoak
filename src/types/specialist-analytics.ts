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

/** Anonymous discovery mix — Pro-only UI; never includes visitor identity. */
export interface SpecialistDiscoveryBreakdown {
  topSurfaces: Array<{ surface: string; count: number }>;
  mobilePercent: number | null;
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
  insightMessage: string;
  coreMetrics: SpecialistAnalyticsMetric[];
  growthInsights: SpecialistGrowthInsight[];
  /** Present when live engagement data includes surface/device mix */
  discoveryBreakdown?: SpecialistDiscoveryBreakdown;
}

export interface SpecialistAnalyticsContext {
  profileCompletionPercent: number;
  rankingPosition: number | null;
  /** When true, show fabricated demo KPIs. Defaults to false (honest zeros). */
  useDemoMetrics?: boolean;
}

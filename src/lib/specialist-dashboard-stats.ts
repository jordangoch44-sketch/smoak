import type {
  SpecialistAnalyticsMetric,
  SpecialistProfileAnalytics,
} from "@/types/specialist-analytics";

export interface AnalyticsStatTile {
  id: string;
  label: string;
  value: string;
  detail?: string;
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatAnalyticsMetricValue(value: number): string {
  if (value >= 10_000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return formatCount(value);
}

export function formatTrendLabel(trend: SpecialistAnalyticsMetric["trend"]): string {
  const { change, period } = formatTrendParts(trend);
  return `${change} ${period}`;
}

export function formatTrendParts(trend: SpecialistAnalyticsMetric["trend"]): {
  change: string;
  period: string;
} {
  const arrow = trend.direction === "up" ? "↗" : trend.direction === "down" ? "↘" : "→";
  const sign =
    trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : "";
  const pct =
    trend.direction === "flat"
      ? "0%"
      : `${sign}${Math.abs(trend.percentChange)}%`;
  return {
    change: `${arrow} ${pct}`,
    period: trend.comparisonLabel,
  };
}

export function buildSecondaryStatTiles(
  analytics: SpecialistProfileAnalytics
): AnalyticsStatTile[] {
  return [
    {
      id: "profile-completion",
      label: "Profile completion",
      value: `${analytics.profileCompletionPercent}%`,
    },
    {
      id: "ranking-visibility",
      label: "Ranking / visibility",
      value: analytics.rankingPosition ? `#${analytics.rankingPosition}` : "Unranked",
      detail: `Visibility score ${analytics.visibilityScore}`,
    },
  ];
}

/** @deprecated Use coreMetrics from analytics — kept for any legacy callers */
export function buildAnalyticsStatTiles(
  analytics: SpecialistProfileAnalytics
): AnalyticsStatTile[] {
  const core = analytics.coreMetrics.map((metric) => ({
    id: metric.id,
    label: metric.label,
    value: formatAnalyticsMetricValue(metric.value),
  }));
  return [...core, ...buildSecondaryStatTiles(analytics)];
}

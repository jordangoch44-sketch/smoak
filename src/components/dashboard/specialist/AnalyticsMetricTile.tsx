"use client";

import { useState, type CSSProperties } from "react";
import { AnalyticsMetricIcon } from "@/components/dashboard/specialist/AnalyticsMetricIcon";
import { PremiumLockedValues } from "@/components/dashboard/shared";
import {
  formatAnalyticsMetricValue,
  formatTrendParts,
} from "@/lib/specialist-dashboard-stats";
import { useAnimatedMetricValue } from "@/hooks/useAnimatedMetricValue";
import type { SpecialistAnalyticsMetric } from "@/types/specialist-analytics";
import { cn } from "@/lib/utils";

interface AnalyticsMetricTileProps {
  metric: SpecialistAnalyticsMetric;
  isPremium: boolean;
  index: number;
}

export function AnalyticsMetricTile({
  metric,
  isPremium,
  index,
}: AnalyticsMetricTileProps) {
  const [pressed, setPressed] = useState(false);
  const locked = !isPremium;
  const fullLock = !isPremium && metric.lockOnFree === true;
  const showTrend = isPremium;
  const animatedValue = useAnimatedMetricValue(
    metric.value,
    isPremium && metric.isCoreKpi === true
  );
  const displayValue = isPremium ? formatAnalyticsMetricValue(animatedValue) : formatAnalyticsMetricValue(metric.value);
  const trendParts = formatTrendParts(metric.trend);
  const trendUp = metric.trend.direction === "up";
  const trendDown = metric.trend.direction === "down";

  return (
    <article
      className={cn(
        "dashboard-metric-tile",
        metric.isCoreKpi && "dashboard-metric-tile--core",
        isPremium && metric.isCoreKpi && "dashboard-metric-tile--premium",
        fullLock && "dashboard-metric-tile--locked",
        pressed && "dashboard-metric-tile--pressed"
      )}
      style={{ "--metric-stagger": `${index * 55}ms` } as CSSProperties}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
    >
      <div className="dashboard-metric-tile__shimmer" aria-hidden />
      <div className="dashboard-metric-tile__top">
        <span className="dashboard-metric-tile__icon-wrap">
          <AnalyticsMetricIcon id={metric.icon} />
        </span>
        {showTrend ? (
          <span
            className={cn(
              "dashboard-metric-tile__trend",
              trendUp && "dashboard-metric-tile__trend--up",
              trendDown && "dashboard-metric-tile__trend--down"
            )}
          >
            <span className="dashboard-metric-tile__trend-change">
              {trendParts.change}
            </span>
            <span className="dashboard-metric-tile__trend-period">
              {trendParts.period}
            </span>
          </span>
        ) : (
          <span className="dashboard-metric-tile__trend dashboard-metric-tile__trend--locked">
            Pro
          </span>
        )}
      </div>
      <p className="dashboard-metric-tile__label">{metric.label}</p>
      <PremiumLockedValues locked={locked}>
        <p className="dashboard-metric-tile__value">{displayValue}</p>
      </PremiumLockedValues>
      {fullLock ? <div className="dashboard-metric-tile__lock-veil" aria-hidden /> : null}
    </article>
  );
}

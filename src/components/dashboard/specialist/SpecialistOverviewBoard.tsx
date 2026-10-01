"use client";

import type { ReactNode } from "react";
import { AnalyticsMetricIcon } from "@/components/dashboard/specialist/AnalyticsMetricIcon";
import { GoogleReviewsCard } from "@/components/dashboard/specialist/cards/GoogleReviewsCard";
import { ReviewsCard } from "@/components/dashboard/specialist/cards/ReviewsCard";
import { VisibilityRankingCard } from "@/components/dashboard/specialist/cards/VisibilityRankingCard";
import { PremiumLockedValues } from "@/components/dashboard/shared";
import { BookmarkIcon, EyeIcon, TrophyIcon } from "@/components/ui/icons";
import { formatAnalyticsMetricValue } from "@/lib/specialist-dashboard-stats";
import { cn } from "@/lib/utils";
import type { Trainer } from "@/types";
import type {
  AnalyticsMetricTrend,
  AnalyticsTrendDirection,
  SpecialistAnalyticsMetric,
  SpecialistProfileAnalytics,
} from "@/types/specialist-analytics";
import type { SpecialistDashboardRanking } from "@/types/specialist-dashboard";

interface SpecialistOverviewBoardProps {
  analytics: SpecialistProfileAnalytics;
  isPremium: boolean;
  ranking: SpecialistDashboardRanking | null;
  city?: string;
  trainer: Trainer | undefined;
  smoacRating?: number | null;
  smoacReviewCount?: number;
  sampleReputation?: boolean;
  categoryLabel?: string;
  onOpenBoost?: () => void;
  onUpgrade?: () => void;
}

type KpiTone = "cyan" | "violet" | "pink" | "green" | "amber" | "blue";

const METRIC_TONE: Record<string, KpiTone> = {
  "profile-views": "cyan",
  "search-appearances": "violet",
  "saved-by-clients": "pink",
  "contact-clicks": "green",
  "booking-clicks": "amber",
};

const METRIC_LABEL: Record<string, string> = {
  "profile-views": "Profile Views",
  "search-appearances": "Search Appearances",
  "saved-by-clients": "Saved by Clients",
  "contact-clicks": "Contact Clicks",
  "booking-clicks": "Booking Clicks",
};

function trendParts(trend: AnalyticsMetricTrend): {
  arrow: string;
  pct: string;
  direction: AnalyticsTrendDirection;
} {
  const arrow =
    trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
  const pct =
    trend.direction === "flat"
      ? "0%"
      : `${trend.direction === "up" ? "+" : "-"}${Math.abs(trend.percentChange)}%`;
  return { arrow, pct, direction: trend.direction };
}

function metricIcon(metric: SpecialistAnalyticsMetric): ReactNode {
  if (metric.id === "profile-views") {
    return <EyeIcon className="overview-kpi__glyph" />;
  }
  if (metric.id === "saved-by-clients") {
    return <BookmarkIcon className="overview-kpi__glyph" />;
  }
  return <AnalyticsMetricIcon id={metric.icon} className="overview-kpi__glyph" />;
}

export function OverviewPeriodChip({ label }: { label: string }) {
  return <p className="overview-period">{label}</p>;
}

export function SpecialistOverviewBoard({
  analytics,
  isPremium,
  ranking,
  city,
  trainer,
  smoacRating = null,
  smoacReviewCount = 0,
  sampleReputation = false,
  categoryLabel,
  onOpenBoost,
  onUpgrade,
}: SpecialistOverviewBoardProps) {
  const cityLabel = city?.trim() || "";
  const rankValue = ranking ? `#${ranking.rank}` : "—";
  const rankDetail = ranking
    ? cityLabel
      ? `in ${cityLabel}`
      : ranking.listingTitle
    : "Not on a city board yet";

  return (
    <div className="specialist-overview-board">
      <ul className="overview-kpis">
        {analytics.coreMetrics.map((metric) => (
          <KpiTile
            key={metric.id}
            tone={METRIC_TONE[metric.id] ?? "cyan"}
            label={METRIC_LABEL[metric.id] ?? metric.label}
            value={formatAnalyticsMetricValue(metric.value)}
            trend={metric.trend}
            locked={!isPremium}
            icon={metricIcon(metric)}
          />
        ))}
        <li>
          <article
            className="overview-kpi overview-kpi--blue"
            aria-label={`City ranking ${rankValue}${cityLabel ? `, ${rankDetail}` : ""}`}
          >
            <span className="overview-kpi__icon" aria-hidden>
              <TrophyIcon className="overview-kpi__glyph" />
            </span>
            <p className="overview-kpi__label">City Ranking</p>
            <PremiumLockedValues locked={!isPremium}>
              <p className="overview-kpi__value">{rankValue}</p>
              <p className="overview-kpi__detail">{rankDetail}</p>
            </PremiumLockedValues>
          </article>
        </li>
      </ul>

      <div className="dashboard-overview-accordions">
        <ReviewsCard
          trainer={trainer}
          isPremium={isPremium}
          smoacRating={smoacRating}
          smoacReviewCount={smoacReviewCount}
          sampleReputation={sampleReputation}
        />
        <VisibilityRankingCard
          ranking={ranking}
          isPremium={isPremium}
          smoacRating={smoacRating}
          smoacReviewCount={smoacReviewCount}
          categoryLabel={categoryLabel}
          onOpenBoost={onOpenBoost}
        />
        <GoogleReviewsCard
          trainer={trainer}
          isPremium={isPremium}
          onUpgrade={onUpgrade}
        />
      </div>
    </div>
  );
}

function KpiTile({
  tone,
  label,
  value,
  trend,
  locked,
  icon,
}: {
  tone: KpiTone;
  label: string;
  value: string;
  trend: AnalyticsMetricTrend;
  locked: boolean;
  icon: ReactNode;
}) {
  const parts = trendParts(trend);
  return (
    <li>
      <article
        className={cn("overview-kpi", `overview-kpi--${tone}`)}
        aria-label={`${label} ${value}, ${parts.arrow} ${parts.pct} ${trend.comparisonLabel}`}
      >
        <span className="overview-kpi__icon" aria-hidden>
          {icon}
        </span>
        <p className="overview-kpi__label">{label}</p>
        <PremiumLockedValues locked={locked}>
          <p className="overview-kpi__value">{value}</p>
          <p
            className={cn(
              "overview-kpi__trend",
              `overview-kpi__trend--${parts.direction}`
            )}
          >
            <span className="overview-kpi__trend-change">
              {parts.arrow} {parts.pct}
            </span>
            <span className="overview-kpi__trend-period">
              {trend.comparisonLabel}
            </span>
          </p>
        </PremiumLockedValues>
      </article>
    </li>
  );
}

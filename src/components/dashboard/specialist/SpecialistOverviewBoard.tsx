"use client";

import { GoogleReviewsCard } from "@/components/dashboard/specialist/cards/GoogleReviewsCard";
import { ReviewsCard } from "@/components/dashboard/specialist/cards/ReviewsCard";
import { VisibilityRankingCard } from "@/components/dashboard/specialist/cards/VisibilityRankingCard";
import { PremiumLockedValues } from "@/components/dashboard/shared";
import { formatAnalyticsMetricValue } from "@/lib/specialist-dashboard-stats";
import { cn } from "@/lib/utils";
import type { Trainer } from "@/types";
import type {
  AnalyticsMetricTrend,
  AnalyticsTrendDirection,
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

const METRIC_LABEL: Record<string, string> = {
  "profile-views": "Profile Views",
  "search-appearances": "Search Appearances",
  "saved-by-clients": "Saved by Clients",
  "contact-clicks": "Contact Clicks",
  "booking-clicks": "Booking Clicks",
};

function formatConversionRate(analytics: SpecialistProfileAnalytics): string {
  const funnelRate = analytics.funnel?.viewToInquiryRate;
  const rate =
    funnelRate != null
      ? funnelRate
      : analytics.profileViews > 0
        ? ((analytics.contactClicks + analytics.bookingClicks) /
            analytics.profileViews) *
          100
        : 0;
  if (!Number.isFinite(rate) || rate <= 0) return "0%";
  const rounded = rate >= 10 ? Math.round(rate) : Math.round(rate * 10) / 10;
  return `${rounded}%`;
}

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
  const conversionValue = formatConversionRate(analytics);
  const conversionIsZero = conversionValue === "0%";
  const rankValue = ranking ? `#${ranking.rank}` : "—";
  const rankDetail = ranking
    ? cityLabel
      ? `in ${cityLabel}`
      : ranking.listingTitle
    : "Not on a city board yet";

  return (
    <div className="specialist-overview-board">
      <ul className="overview-kpis" data-tour="overview-kpis">
        {analytics.coreMetrics.map((metric) => (
          <KpiTile
            key={metric.id}
            label={METRIC_LABEL[metric.id] ?? metric.label}
            value={formatAnalyticsMetricValue(metric.value)}
            trend={metric.trend}
            locked={!isPremium}
          />
        ))}
        <KpiTile
          label="Conversion Rate"
          value={conversionValue}
          trend={{
            direction: "flat",
            percentChange: 0,
            comparisonLabel: conversionIsZero
              ? "vs last week"
              : "of profile views",
          }}
          locked={!isPremium}
          quietTrend={!conversionIsZero}
        />
        <li className="overview-kpis__feature">
          <article
            className="overview-kpi overview-kpi--rank"
            aria-label={`City ranking ${rankValue}${cityLabel ? `, ${rankDetail}` : ""}`}
          >
            <p className="overview-kpi__label">City Ranking</p>
            <div className="overview-kpi__rank-row">
              <PremiumLockedValues locked={!isPremium}>
                <div className="overview-kpi__rank-copy">
                  <p className="overview-kpi__value">{rankValue}</p>
                  <p className="overview-kpi__detail">{rankDetail}</p>
                </div>
              </PremiumLockedValues>
              {isPremium && ranking?.rank === 1 ? (
                <span className="overview-kpi__badge">Top in city</span>
              ) : null}
            </div>
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
  label,
  value,
  trend,
  locked,
  quietTrend = false,
}: {
  label: string;
  value: string;
  trend: AnalyticsMetricTrend;
  locked: boolean;
  /** Rate has no week-over-week delta — show the comparison line only. */
  quietTrend?: boolean;
}) {
  const parts = trendParts(trend);
  const trendLabel = quietTrend
    ? `${value} ${trend.comparisonLabel}`
    : `${parts.arrow} ${parts.pct} ${trend.comparisonLabel}`;
  return (
    <li>
      <article
        className="overview-kpi"
        aria-label={`${label} ${value}, ${trendLabel}`}
      >
        <p className="overview-kpi__label">{label}</p>
        <PremiumLockedValues locked={locked}>
          <p className="overview-kpi__value">{value}</p>
          <p
            className={cn(
              "overview-kpi__trend",
              !quietTrend && `overview-kpi__trend--${parts.direction}`
            )}
          >
            {quietTrend ? null : (
              <span className="overview-kpi__trend-change">
                {parts.arrow} {parts.pct}
              </span>
            )}
            <span className="overview-kpi__trend-period">
              {trend.comparisonLabel}
            </span>
          </p>
        </PremiumLockedValues>
      </article>
    </li>
  );
}

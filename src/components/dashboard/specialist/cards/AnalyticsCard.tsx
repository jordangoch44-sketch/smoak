"use client";

import { useState } from "react";
import type { SpecialistProfileAnalytics } from "@/types/specialist-analytics";
import { buildSecondaryStatTiles } from "@/lib/specialist-dashboard-stats";
import { SMOAC_PRO_UNLOCK } from "@/lib/specialist-premium";
import { AnalyticsMetricTile } from "@/components/dashboard/specialist/AnalyticsMetricTile";
import {
  DashboardButton,
  DashboardCollapsibleSection,
  PremiumUnlockCta,
  SmoacProUpgradeModal,
  StatTile,
  DashboardSectionIcon,
} from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

interface AnalyticsCardProps {
  analytics: SpecialistProfileAnalytics;
  isPremium: boolean;
  defaultOpen?: boolean;
}

export function AnalyticsCard({
  analytics,
  isPremium,
  defaultOpen = false,
}: AnalyticsCardProps) {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const secondaryTiles = buildSecondaryStatTiles(analytics);
  const viewsMetric = analytics.coreMetrics.find((m) => m.id === "profile-views");
  const summary = viewsMetric ? (
    <span className="dashboard-analytics__summary-views">
      <span className="dashboard-analytics__summary-views-number">
        {viewsMetric.value.toLocaleString("en-US")}
      </span>{" "}
      <span className="dashboard-analytics__summary-views-label">profile views</span>
    </span>
  ) : (
    analytics.periodLabel
  );

  return (
    <>
      <DashboardCollapsibleSection
        title="Profile Analytics"
        icon={<DashboardSectionIcon id="analytics" />}
        description={
          isPremium
            ? "Business intelligence for your marketplace visibility and client demand."
            : "See how clients discover you — unlock full performance data with Pro."
        }
        summary={summary}
        defaultOpen={defaultOpen}
        span="full"
        className={cn(
          "dashboard-analytics",
          isPremium ? "dashboard-analytics--premium" : "dashboard-analytics--free"
        )}
      >
        <div className="dashboard-analytics__card dashboard-analytics__card--accordion">
          <div className="dashboard-analytics__title-row dashboard-analytics__title-row--inline">
            <p className="dashboard-analytics__period">{analytics.periodLabel}</p>
            <span
              className={cn(
                "dashboard-analytics__badge",
                !isPremium && "dashboard-analytics__badge--pro"
              )}
            >
              Pro
            </span>
          </div>

          <div className="dashboard-analytics__stats dashboard-stat-grid dashboard-analytics__stats--core">
            {analytics.coreMetrics.map((metric, index) => (
              <AnalyticsMetricTile
                key={metric.id}
                metric={metric}
                isPremium={isPremium}
                index={index}
              />
            ))}
          </div>

          <div className="dashboard-analytics__stats dashboard-stat-grid dashboard-analytics__stats--secondary">
            {secondaryTiles.map((tile) => (
              <StatTile
                key={tile.id}
                label={tile.label}
                value={tile.value}
                detail={tile.detail}
                lockValues={!isPremium}
                className={cn(
                  "dashboard-stat-tile--secondary",
                  !isPremium && "dashboard-stat-tile--locked-card"
                )}
              />
            ))}
          </div>

          {isPremium && analytics.discoveryBreakdown ? (
            <div className="dashboard-analytics__discovery">
              <h3 className="dashboard-analytics__discovery-title">
                Discovery mix
              </h3>
              <p className="dashboard-analytics__discovery-note">
                Anonymous — where and how clients find you (not who).
              </p>
              <ul className="dashboard-analytics__discovery-list">
                {analytics.discoveryBreakdown.topSurfaces.length > 0 ? (
                  analytics.discoveryBreakdown.topSurfaces.map((row) => (
                    <li key={row.surface}>
                      <span>{row.surface}</span>
                      <strong>{row.count.toLocaleString("en-US")}</strong>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>No search appearances yet</span>
                    <strong>0</strong>
                  </li>
                )}
                {analytics.discoveryBreakdown.mobilePercent != null ? (
                  <li>
                    <span>Mobile vs desktop</span>
                    <strong>
                      {analytics.discoveryBreakdown.mobilePercent}% mobile
                    </strong>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {!isPremium ? (
            <>
              <PremiumUnlockCta onUpgrade={() => setUpgradeModalOpen(true)} />
              <div className="dashboard-analytics__actions dashboard-actions-row">
                <DashboardButton
                  inline
                  className="dashboard-pro-upgrade-btn"
                  onClick={() => setUpgradeModalOpen(true)}
                >
                  {SMOAC_PRO_UNLOCK.cta}
                </DashboardButton>
              </div>
            </>
          ) : null}
        </div>
      </DashboardCollapsibleSection>

      <SmoacProUpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
      />
    </>
  );
}

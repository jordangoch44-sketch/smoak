"use client";

import { useState } from "react";
import type { SpecialistProfileAnalytics } from "@/types/specialist-analytics";
import { buildSecondaryStatTiles } from "@/lib/specialist-dashboard-stats";
import { SMOAC_PRO_UNLOCK } from "@/lib/specialist-premium";
import { AnalyticsMetricTile } from "@/components/dashboard/specialist/AnalyticsMetricTile";
import { GrowthInsightsSection } from "@/components/dashboard/specialist/GrowthInsightsSection";
import {
  BoostVisibilityModal,
  DashboardButton,
  PremiumLockedValues,
  PremiumUnlockCta,
  SmoacProUpgradeModal,
  StatTile,
} from "@/components/dashboard/shared";
import { SitePromoSlot } from "@/components/promo/SitePromoSlot";
import { cn } from "@/lib/utils";

interface AnalyticsCardProps {
  analytics: SpecialistProfileAnalytics;
  isPremium: boolean;
}

export function AnalyticsCard({ analytics, isPremium }: AnalyticsCardProps) {
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const secondaryTiles = buildSecondaryStatTiles(analytics);

  return (
    <>
      <section
        className={cn(
          "dashboard-analytics dashboard-grid__span-2",
          isPremium ? "dashboard-analytics--premium" : "dashboard-analytics--free"
        )}
        aria-labelledby="dashboard-analytics-title"
      >
        <div className="dashboard-analytics__card dashboard-glass-premium dashboard-glow-border">
          <div className="dashboard-analytics__ambient" aria-hidden />
          <header className="dashboard-analytics__header">
            <div>
              <div className="dashboard-analytics__title-row">
                <h2 id="dashboard-analytics-title" className="dashboard-analytics__title">
                  Profile Analytics
                </h2>
                <span
                  className={cn(
                    "dashboard-analytics__badge",
                    !isPremium && "dashboard-analytics__badge--pro"
                  )}
                >
                  Pro
                </span>
              </div>
              <p className="dashboard-analytics__subtitle">
                {isPremium
                  ? "Business intelligence for your marketplace visibility and client demand."
                  : "See how clients discover you — unlock full performance data with Pro."}
              </p>
            </div>
            <p className="dashboard-analytics__period">{analytics.periodLabel}</p>
          </header>

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

          <GrowthInsightsSection
            insights={analytics.growthInsights}
            isPremium={isPremium}
          />

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

          <aside className="dashboard-analytics__insight dashboard-insight-box">
            <p className="dashboard-analytics__insight-label">Quick tip</p>
            <PremiumLockedValues locked={!isPremium}>
              <p className="dashboard-analytics__insight-text">
                {analytics.insightMessage}
              </p>
            </PremiumLockedValues>
          </aside>

          {!isPremium ? (
            <PremiumUnlockCta onUpgrade={() => setUpgradeModalOpen(true)} />
          ) : null}

          <div className="dashboard-analytics__actions dashboard-actions-row">
            <DashboardButton inline onClick={() => setBoostModalOpen(true)}>
              Boost Visibility
            </DashboardButton>
            {!isPremium ? (
              <DashboardButton
                inline
                className="dashboard-pro-upgrade-btn"
                onClick={() => setUpgradeModalOpen(true)}
              >
                {SMOAC_PRO_UNLOCK.cta}
              </DashboardButton>
            ) : null}
            <DashboardButton variant="secondary" href="/specialist-dashboard/edit-profile">
              Improve Profile
            </DashboardButton>
          </div>

          {isPremium ? (
            <SitePromoSlot
              slotId="specialist_dashboard_boost"
              className="dashboard-analytics__promo"
              variant="compact"
              onOpenBoost={() => setBoostModalOpen(true)}
              onOpenPro={() => setUpgradeModalOpen(true)}
            />
          ) : null}
        </div>
      </section>

      <BoostVisibilityModal
        open={boostModalOpen}
        onClose={() => setBoostModalOpen(false)}
      />

      <SmoacProUpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
      />
    </>
  );
}

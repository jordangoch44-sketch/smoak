"use client";

import { useState } from "react";
import { BOOST_VISIBILITY_MODAL } from "@/constants/specialist-dashboard-mock";
import type { SpecialistProfileAnalytics } from "@/types/specialist-analytics";
import { buildSecondaryStatTiles } from "@/lib/specialist-dashboard-stats";
import { SMOAC_PRO_UNLOCK } from "@/lib/specialist-premium";
import { AnalyticsMetricTile } from "@/components/dashboard/specialist/AnalyticsMetricTile";
import { GrowthInsightsSection } from "@/components/dashboard/specialist/GrowthInsightsSection";
import {
  DashboardButton,
  DashboardComingSoonModal,
  PremiumLockedValues,
  PremiumUnlockCta,
  SmoacProUpgradeModal,
  StatTile,
} from "@/components/dashboard/shared";
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
                  {isPremium ? "Premium" : "PRO"}
                </span>
              </div>
              <p className="dashboard-analytics__subtitle">
                {isPremium
                  ? "Business intelligence for your marketplace visibility and client demand."
                  : "See how clients discover you — unlock full performance data with Premium."}
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
            {isPremium ? (
              <DashboardButton inline onClick={() => setBoostModalOpen(true)}>
                Boost Visibility
              </DashboardButton>
            ) : (
              <DashboardButton
                inline
                className="dashboard-pro-upgrade-btn"
                onClick={() => setUpgradeModalOpen(true)}
              >
                {SMOAC_PRO_UNLOCK.cta}
              </DashboardButton>
            )}
            <DashboardButton variant="secondary" href="/specialist-dashboard/edit-profile">
              Improve Profile
            </DashboardButton>
          </div>
        </div>
      </section>

      <DashboardComingSoonModal
        open={boostModalOpen}
        title={BOOST_VISIBILITY_MODAL.title}
        description={BOOST_VISIBILITY_MODAL.description}
        onClose={() => setBoostModalOpen(false)}
      />

      <SmoacProUpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import type { SpecialistProfileAnalytics } from "@/types/specialist-analytics";
import { buildSecondaryStatTiles } from "@/lib/specialist-dashboard-stats";
import { AnalyticsMetricTile } from "@/components/dashboard/specialist/AnalyticsMetricTile";
import { GrowthInsightsSection } from "@/components/dashboard/specialist/GrowthInsightsSection";
import {
  BoostVisibilityModal,
  SmoacProUpgradeModal,
  StatTile,
} from "@/components/dashboard/shared";
import { SitePromoSlot } from "@/components/promo/SitePromoSlot";

interface SpecialistProGhostPreviewProps {
  firstName: string;
  analytics: SpecialistProfileAnalytics;
}

/**
 * Plan-tab Pro tease: core analytics readable, deeper metrics blurred,
 * then house promo slot for Boost / deals. Pro CTA lives in the hero promo.
 */
export function SpecialistProGhostPreview({
  firstName,
  analytics,
}: SpecialistProGhostPreviewProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const name = firstName.trim() || "Your";
  const secondaryTiles = buildSecondaryStatTiles(analytics);
  const coreMetrics = analytics.coreMetrics.slice(0, 4);

  return (
    <>
      <SitePromoSlot
        slotId="specialist_dashboard_hero"
        onOpenPro={() => setUpgradeOpen(true)}
        onOpenBoost={() => setBoostOpen(true)}
      />

      <section
        className="specialist-pro-ghost"
        aria-labelledby="specialist-pro-ghost-title"
      >
        <header className="specialist-pro-ghost__intro">
          <p className="specialist-pro-ghost__eyebrow">Example Pro dashboard</p>
          <h2
            id="specialist-pro-ghost-title"
            className="specialist-pro-ghost__title"
          >
            {name === "Your" ? "Your Pro analytics" : `${name}'s Pro analytics`}
          </h2>
          <p className="specialist-pro-ghost__lede">
            Sample of the headline metrics Pro unlocks — deeper insights stay
            locked until you start your free month.
          </p>
        </header>

        <div className="specialist-pro-ghost__stage">
          <div className="specialist-pro-ghost__card dashboard-glass-premium dashboard-glow-border">
            <div className="specialist-pro-ghost__card-ambient" aria-hidden />

            <header className="specialist-pro-ghost__card-head">
              <div>
                <div className="specialist-pro-ghost__card-title-row">
                  <p className="specialist-pro-ghost__card-title">
                    Profile Analytics
                  </p>
                  <span className="dashboard-analytics__badge">Pro</span>
                </div>
                <p className="specialist-pro-ghost__card-period">
                  {analytics.periodLabel}
                </p>
              </div>
            </header>

            <div className="specialist-pro-ghost__core dashboard-stat-grid dashboard-analytics__stats--core">
              {coreMetrics.map((metric, index) => (
                <AnalyticsMetricTile
                  key={metric.id}
                  metric={metric}
                  isPremium
                  index={index}
                />
              ))}
            </div>

            <div className="specialist-pro-ghost__deeper">
              <div className="specialist-pro-ghost__deeper-inner" aria-hidden>
                <div className="dashboard-stat-grid dashboard-analytics__stats--secondary">
                  {secondaryTiles.map((tile) => (
                    <StatTile
                      key={tile.id}
                      label={tile.label}
                      value={tile.value}
                      detail={tile.detail}
                      className="dashboard-stat-tile--secondary"
                    />
                  ))}
                </div>
                <GrowthInsightsSection
                  insights={analytics.growthInsights}
                  isPremium
                />
              </div>
              <div className="specialist-pro-ghost__deeper-veil" aria-hidden />
              <p className="specialist-pro-ghost__deeper-label">
                More Pro insights
              </p>
            </div>
          </div>
        </div>

        <SitePromoSlot
          slotId="specialist_dashboard_boost"
          onOpenBoost={() => setBoostOpen(true)}
          onOpenPro={() => setUpgradeOpen(true)}
        />
      </section>

      <SmoacProUpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
      <BoostVisibilityModal
        open={boostOpen}
        onClose={() => setBoostOpen(false)}
      />
    </>
  );
}

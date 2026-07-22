"use client";

import { useState } from "react";
import type { SpecialistProfileAnalytics } from "@/types/specialist-analytics";
import { SMOAC_PRO_UNLOCK, SMOAC_PRO_PRICE_LABEL } from "@/lib/specialist-premium";
import { buildSecondaryStatTiles } from "@/lib/specialist-dashboard-stats";
import { AnalyticsMetricTile } from "@/components/dashboard/specialist/AnalyticsMetricTile";
import { GrowthInsightsSection } from "@/components/dashboard/specialist/GrowthInsightsSection";
import {
  DashboardButton,
  DashboardComingSoonModal,
  SmoacProUpgradeModal,
  StatTile,
} from "@/components/dashboard/shared";
import { BOOST_VISIBILITY_MODAL } from "@/constants/specialist-dashboard-mock";

interface SpecialistProGhostPreviewProps {
  firstName: string;
  analytics: SpecialistProfileAnalytics;
}

/**
 * Plan-tab Pro tease: core analytics readable, deeper metrics blurred,
 * trial CTA, then room for a Boost / ads teaser below.
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
                  <span className="dashboard-analytics__badge">Premium</span>
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

        <div className="specialist-pro-ghost__offer">
          <p className="specialist-pro-ghost__offer-title">
            {SMOAC_PRO_UNLOCK.title}
          </p>
          <p className="specialist-pro-ghost__offer-text">
            Unlock the rest of your dashboard — free for 30 days.
          </p>
          <DashboardButton
            className="dashboard-pro-upgrade-btn specialist-pro-ghost__cta"
            onClick={() => setUpgradeOpen(true)}
          >
            {SMOAC_PRO_UNLOCK.cta}
          </DashboardButton>
          <p className="specialist-pro-ghost__fineprint">
            {SMOAC_PRO_UNLOCK.afterTrial}
          </p>
        </div>

        <section
          className="specialist-boost-teaser"
          aria-labelledby="specialist-boost-teaser-title"
        >
          <div className="specialist-boost-teaser__copy">
            <p className="specialist-boost-teaser__eyebrow">Grow faster</p>
            <h3
              id="specialist-boost-teaser-title"
              className="specialist-boost-teaser__title"
            >
              Boost profile & ads
            </h3>
            <p className="specialist-boost-teaser__text">
              Stand out in Explore with sponsored placement and boosted
              visibility — reach more clients in your city.
            </p>
          </div>
          <DashboardButton
            className="specialist-boost-teaser__btn"
            onClick={() => setBoostOpen(true)}
          >
            Explore boosts
          </DashboardButton>
          <p className="specialist-boost-teaser__fineprint">
            Available with Pro · from {SMOAC_PRO_PRICE_LABEL}
          </p>
        </section>
      </section>

      <SmoacProUpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
      <DashboardComingSoonModal
        open={boostOpen}
        title={BOOST_VISIBILITY_MODAL.title}
        description={BOOST_VISIBILITY_MODAL.description}
        onClose={() => setBoostOpen(false)}
      />
    </>
  );
}

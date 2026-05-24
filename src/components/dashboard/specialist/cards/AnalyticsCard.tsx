"use client";

import { useState } from "react";
import { BOOST_VISIBILITY_MODAL } from "@/constants/specialist-dashboard-mock";
import type { SpecialistProfileAnalytics } from "@/types/specialist-analytics";
import { buildAnalyticsStatTiles } from "@/lib/specialist-dashboard-stats";
import {
  DashboardButton,
  DashboardComingSoonModal,
  StatTile,
} from "@/components/dashboard/shared";

interface AnalyticsCardProps {
  analytics: SpecialistProfileAnalytics;
}

export function AnalyticsCard({ analytics }: AnalyticsCardProps) {
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const statTiles = buildAnalyticsStatTiles(analytics);

  return (
    <>
      <section
        className="dashboard-analytics dashboard-grid__span-2"
        aria-labelledby="dashboard-analytics-title"
      >
        <div className="dashboard-analytics__card dashboard-glass-premium dashboard-glow-border">
          <header className="dashboard-analytics__header">
            <div>
              <div className="dashboard-analytics__title-row">
                <h2 id="dashboard-analytics-title" className="dashboard-analytics__title">
                  Profile Analytics
                </h2>
                <span className="dashboard-analytics__badge">Premium</span>
              </div>
              <p className="dashboard-analytics__subtitle">
                See how clients are discovering and interacting with your profile.
              </p>
            </div>
            <p className="dashboard-analytics__period">{analytics.periodLabel}</p>
          </header>

          <div className="dashboard-analytics__stats dashboard-stat-grid">
            {statTiles.map((tile) => (
              <StatTile
                key={tile.id}
                label={tile.label}
                value={tile.value}
                detail={tile.detail}
              />
            ))}
          </div>

          <aside className="dashboard-analytics__insight dashboard-insight-box">
            <p className="dashboard-analytics__insight-label">Insight</p>
            <p className="dashboard-analytics__insight-text">{analytics.insightMessage}</p>
          </aside>

          <div className="dashboard-analytics__actions dashboard-actions-row">
            <DashboardButton inline onClick={() => setBoostModalOpen(true)}>
              Boost Visibility
            </DashboardButton>
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
    </>
  );
}

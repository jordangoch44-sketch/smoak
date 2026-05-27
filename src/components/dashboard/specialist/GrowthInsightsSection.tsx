"use client";

import type { CSSProperties } from "react";
import { PremiumLockedValues } from "@/components/dashboard/shared";
import { AnalyticsMetricIcon } from "@/components/dashboard/specialist/AnalyticsMetricIcon";
import type { SpecialistGrowthInsight } from "@/types/specialist-analytics";
import { cn } from "@/lib/utils";

interface GrowthInsightsSectionProps {
  insights: SpecialistGrowthInsight[];
  isPremium: boolean;
}

export function GrowthInsightsSection({
  insights,
  isPremium,
}: GrowthInsightsSectionProps) {
  return (
    <section
      className={cn(
        "dashboard-growth-insights dashboard-glass-premium",
        !isPremium && "dashboard-growth-insights--locked"
      )}
      aria-labelledby="dashboard-growth-insights-title"
    >
      <div className="dashboard-growth-insights__shimmer" aria-hidden />
      <header className="dashboard-growth-insights__header">
        <span className="dashboard-growth-insights__icon" aria-hidden>
          <AnalyticsMetricIcon id="crown" />
        </span>
        <div>
          <h3 id="dashboard-growth-insights-title" className="dashboard-growth-insights__title">
            Growth Insights
          </h3>
          <p className="dashboard-growth-insights__subtitle">
            Marketplace intelligence tailored to your profile
          </p>
        </div>
      </header>
      <PremiumLockedValues locked={!isPremium}>
        <ul className="dashboard-growth-insights__list">
          {insights.map((insight, index) => (
            <li
              key={insight.id}
              className="dashboard-growth-insights__item"
              style={{ "--insight-stagger": `${index * 70}ms` } as CSSProperties}
            >
              <span className="dashboard-growth-insights__bullet" aria-hidden />
              <p className="dashboard-growth-insights__text">{insight.message}</p>
            </li>
          ))}
        </ul>
      </PremiumLockedValues>
      {!isPremium ? (
        <div className="dashboard-growth-insights__frost" aria-hidden>
          <p className="dashboard-growth-insights__frost-label">Unlock Premium Insights</p>
        </div>
      ) : null}
    </section>
  );
}

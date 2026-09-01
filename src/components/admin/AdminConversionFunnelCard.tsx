"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type {
  FunnelStageMetric,
  FunnelWindow,
  MarketplaceConversionFunnel,
  SpecialistConversionMetric,
} from "@/types/admin-conversion-funnel";
import { cn } from "@/lib/utils";

interface AdminConversionFunnelCardProps {
  initialFunnel?: MarketplaceConversionFunnel | null;
  className?: string;
}

const STAGE_GRADIENTS: Record<string, string> = {
  impressions: "linear-gradient(90deg, rgba(167, 139, 250, 0.85), rgba(139, 92, 246, 0.95))",
  profile_views: "linear-gradient(90deg, rgba(139, 92, 246, 0.85), rgba(124, 58, 237, 0.95))",
  high_intent_actions: "linear-gradient(90deg, rgba(124, 58, 237, 0.85), rgba(99, 102, 241, 0.95))",
  inquiry_started: "linear-gradient(90deg, rgba(99, 102, 241, 0.85), rgba(59, 130, 246, 0.95))",
  inquiry_submitted: "linear-gradient(90deg, rgba(52, 211, 153, 0.85), rgba(16, 185, 129, 0.95))",
};

export function AdminConversionFunnelCard({
  initialFunnel,
  className,
}: AdminConversionFunnelCardProps) {
  const [windowType, setWindowType] = useState<FunnelWindow>("7d");
  const [funnel, setFunnel] = useState<MarketplaceConversionFunnel | null>(
    initialFunnel ?? null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/admin/conversion-funnel?window=${windowType}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data: { ok?: boolean; funnel?: MarketplaceConversionFunnel }) => {
        if (cancelled) return;
        if (data.ok && data.funnel) {
          setFunnel(data.funnel);
        }
      })
      .catch((err) => {
        console.warn("[SMOAC admin] Funnel fetch error:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [windowType]);

  const stages = funnel?.stages ?? [];
  const maxCount = stages.length > 0 ? Math.max(...stages.map((s) => s.count), 1) : 1;
  const topSpecialists = funnel?.topSpecialists ?? [];
  const insights = funnel?.insights ?? [];

  return (
    <div className={cn("admin-funnel-card", className)}>
      {/* Header with Title and 7d/30d Window Toggle */}
      <div className="admin-funnel-card__header">
        <div className="admin-funnel-card__title-group">
          <div className="admin-funnel-card__eyebrow-row">
            <span className="admin-funnel-card__eyebrow">Marketplace Intelligence</span>
            <span className="admin-funnel-card__badge-live">Live Telemetry</span>
          </div>
          <h3 className="admin-funnel-card__title">Conversion Funnel Analytics</h3>
          <p className="admin-funnel-card__subtitle">
            Discovery impressions to high-intent actions &amp; closed client inquiries
          </p>
        </div>

        <div className="admin-funnel-card__controls">
          <div className="admin-funnel-card__toggle-group" role="tablist" aria-label="Funnel Window">
            <button
              type="button"
              role="tab"
              aria-selected={windowType === "7d"}
              className={cn(
                "admin-funnel-card__toggle-btn",
                windowType === "7d" && "admin-funnel-card__toggle-btn--active"
              )}
              onClick={() => setWindowType("7d")}
            >
              7 Days
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={windowType === "30d"}
              className={cn(
                "admin-funnel-card__toggle-btn",
                windowType === "30d" && "admin-funnel-card__toggle-btn--active"
              )}
              onClick={() => setWindowType("30d")}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="admin-funnel-card__kpis">
        <div className="admin-funnel-card__kpi">
          <span className="admin-funnel-card__kpi-label">View → Inquiry Rate</span>
          <div className="admin-funnel-card__kpi-value-row">
            <span className="admin-funnel-card__kpi-value">
              {funnel ? `${funnel.viewToInquiryRate}%` : "—"}
            </span>
            <span className="admin-funnel-card__kpi-tag admin-funnel-card__kpi-tag--highlight">
              Stage 2 → 5
            </span>
          </div>
          <span className="admin-funnel-card__kpi-hint">
            Profile visitors converting to inquiries
          </span>
        </div>

        <div className="admin-funnel-card__kpi">
          <span className="admin-funnel-card__kpi-label">Inquiry Close Rate</span>
          <div className="admin-funnel-card__kpi-value-row">
            <span className="admin-funnel-card__kpi-value">
              {funnel ? `${funnel.inquiryCompletionRate}%` : "—"}
            </span>
            <span className="admin-funnel-card__kpi-tag admin-funnel-card__kpi-tag--positive">
              Stage 4 → 5
            </span>
          </div>
          <span className="admin-funnel-card__kpi-hint">
            Inquiry drafts successfully sent
          </span>
        </div>

        <div className="admin-funnel-card__kpi">
          <span className="admin-funnel-card__kpi-label">Profile Engagement</span>
          <div className="admin-funnel-card__kpi-value-row">
            <span className="admin-funnel-card__kpi-value">
              {funnel ? `${funnel.profileEngagementRate}%` : "—"}
            </span>
            <span className="admin-funnel-card__kpi-tag">
              Stage 2 → 3
            </span>
          </div>
          <span className="admin-funnel-card__kpi-hint">
            Visitors saving or tapping contact
          </span>
        </div>

        <div className="admin-funnel-card__kpi">
          <span className="admin-funnel-card__kpi-label">End-to-End Conversion</span>
          <div className="admin-funnel-card__kpi-value-row">
            <span className="admin-funnel-card__kpi-value">
              {funnel ? `${funnel.overallConversionRate}%` : "—"}
            </span>
            <span className="admin-funnel-card__kpi-tag">
              Full Funnel
            </span>
          </div>
          <span className="admin-funnel-card__kpi-hint">
            Impression to sent inquiry
          </span>
        </div>
      </div>

      {/* Visual Funnel Step Bars */}
      <div className={cn("admin-funnel-card__funnel-flow", loading && "admin-funnel-card__funnel-flow--loading")}>
        <div className="admin-funnel-card__flow-header">
          <h4 className="admin-funnel-card__section-title">Marketplace Conversion Cascade</h4>
          <span className="admin-funnel-card__flow-period">{funnel?.periodLabel ?? "Last 7 days"}</span>
        </div>

        <div className="admin-funnel-card__stages">
          {stages.map((stage, idx) => {
            const widthPct = Math.max(8, (stage.count / maxCount) * 100);
            const isLast = idx === stages.length - 1;

            return (
              <div key={stage.id} className="admin-funnel-stage">
                <div className="admin-funnel-stage__header">
                  <div className="admin-funnel-stage__meta">
                    <span className="admin-funnel-stage__num">0{stage.stageNumber}</span>
                    <div>
                      <h5 className="admin-funnel-stage__name">{stage.label}</h5>
                      <p className="admin-funnel-stage__desc">{stage.description}</p>
                    </div>
                  </div>

                  <div className="admin-funnel-stage__stats">
                    <div className="admin-funnel-stage__count-wrap">
                      <span className="admin-funnel-stage__count">
                        {stage.count.toLocaleString("en-US")}
                      </span>
                      {stage.percentChange != null && (
                        <span
                          className={cn(
                            "admin-funnel-stage__change",
                            stage.percentChange >= 0
                              ? "admin-funnel-stage__change--up"
                              : "admin-funnel-stage__change--down"
                          )}
                        >
                          {stage.percentChange >= 0 ? "+" : ""}
                          {stage.percentChange}%
                        </span>
                      )}
                    </div>

                    <div className="admin-funnel-stage__badges">
                      {stage.conversionRate != null && (
                        <span className="admin-funnel-badge admin-funnel-badge--conversion">
                          {stage.conversionRate}% conv.
                        </span>
                      )}
                      {stage.dropoffRate != null && stage.dropoffRate > 0 && (
                        <span className="admin-funnel-badge admin-funnel-badge--dropoff">
                          {stage.dropoffRate}% drop
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bar visualization */}
                <div className="admin-funnel-stage__bar-track">
                  <div
                    className="admin-funnel-stage__bar-fill"
                    style={{
                      width: `${widthPct}%`,
                      background: STAGE_GRADIENTS[stage.id] ?? STAGE_GRADIENTS.impressions,
                    }}
                  />
                </div>

                {/* Step Connector Indicator */}
                {!isLast && (
                  <div className="admin-funnel-stage__connector">
                    <div className="admin-funnel-stage__connector-line" />
                    {stages[idx + 1]?.conversionRate != null && (
                      <span className="admin-funnel-stage__connector-pill">
                        {stages[idx + 1].conversionRate}% progression
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Split Section: Top Specialists & Actionable Insights */}
      <div className="admin-funnel-card__grid-split">
        {/* Top Converting Specialists Leaderboard */}
        <div className="admin-funnel-card__leaderboard">
          <div className="admin-funnel-card__flow-header">
            <h4 className="admin-funnel-card__section-title">Top Specialists by Conversion</h4>
            <span className="admin-funnel-card__flow-period">View → Inquiry Efficiency</span>
          </div>

          <div className="admin-funnel-leaderboard">
            {topSpecialists.length > 0 ? (
              topSpecialists.map((spec, i) => (
                <div key={spec.specialistId} className="admin-funnel-leaderboard__row">
                  <div className="admin-funnel-leaderboard__rank">#{i + 1}</div>

                  <div className="admin-funnel-leaderboard__avatar-wrap">
                    {spec.avatarUrl ? (
                      <Image
                        src={spec.avatarUrl}
                        alt={spec.specialistName}
                        width={36}
                        height={36}
                        className="admin-funnel-leaderboard__avatar"
                      />
                    ) : (
                      <div className="admin-funnel-leaderboard__avatar-placeholder">
                        {spec.specialistName.slice(0, 1)}
                      </div>
                    )}
                  </div>

                  <div className="admin-funnel-leaderboard__info">
                    <div className="admin-funnel-leaderboard__name-row">
                      <span className="admin-funnel-leaderboard__name">{spec.specialistName}</span>
                      {spec.tier && (
                        <span className="admin-funnel-leaderboard__tier">{spec.tier}</span>
                      )}
                    </div>
                    <span className="admin-funnel-leaderboard__profession">
                      {spec.profession ?? "Specialist"} · {spec.city ?? "New York"}
                    </span>
                  </div>

                  <div className="admin-funnel-leaderboard__metrics">
                    <div className="admin-funnel-leaderboard__substat">
                      <span className="admin-funnel-leaderboard__substat-num">
                        {spec.profileViews}
                      </span>
                      <span className="admin-funnel-leaderboard__substat-label">Views</span>
                    </div>

                    <div className="admin-funnel-leaderboard__substat">
                      <span className="admin-funnel-leaderboard__substat-num">
                        {spec.inquiriesSubmitted}
                      </span>
                      <span className="admin-funnel-leaderboard__substat-label">Inquiries</span>
                    </div>

                    <div className="admin-funnel-leaderboard__rate-pill">
                      <strong>{spec.viewToInquiryRate}%</strong>
                      <span>Rate</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="admin-funnel-card__empty">
                <p>No specialist conversion data recorded for this period yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Growth & Conversion Insights */}
        <div className="admin-funnel-card__insights-panel">
          <div className="admin-funnel-card__flow-header">
            <h4 className="admin-funnel-card__section-title">Funnel Intelligence &amp; Actions</h4>
            <span className="admin-funnel-card__flow-period">Automated Diagnostics</span>
          </div>

          <div className="admin-funnel-insights">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "admin-funnel-insight-card",
                  `admin-funnel-insight-card--${insight.tone}`
                )}
              >
                <div className="admin-funnel-insight-card__header">
                  <h6 className="admin-funnel-insight-card__title">{insight.title}</h6>
                  {insight.metricValue && (
                    <span className="admin-funnel-insight-card__metric">
                      {insight.metricValue}
                    </span>
                  )}
                </div>
                <p className="admin-funnel-insight-card__summary">{insight.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

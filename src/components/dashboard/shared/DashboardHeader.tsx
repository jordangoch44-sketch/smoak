import type { ReactNode } from "react";

export interface DashboardHeaderProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  /** Optional epigraph under the subtitle */
  quote?: string;
  quoteAttribution?: string;
  roleLabel?: string;
  /** Visual tone for the plan badge (e.g. neon Pro Trial) */
  roleLabelTone?: "default" | "pro-trial";
  statusLabel?: string | null;
  statusTone?: "pending" | "active" | "rejected";
  actions?: ReactNode;
  introActions?: ReactNode;
}

export function DashboardHeader({
  eyebrow,
  title,
  subtitle,
  quote,
  quoteAttribution,
  roleLabel,
  roleLabelTone = "default",
  statusLabel,
  statusTone = "pending",
  actions,
  introActions,
}: DashboardHeaderProps) {
  const hasAside = Boolean(roleLabel || statusLabel || actions);

  return (
    <header className="dashboard-page__header">
      <div
        className={
          hasAside
            ? "dashboard-page__header-row"
            : "dashboard-page__header-row dashboard-page__header-row--solo"
        }
      >
        <div className="dashboard-page__header-main">
          <p className="dashboard-page__eyebrow">{eyebrow}</p>
          <h1 className="dashboard-page__title">{title}</h1>
          <p className="dashboard-page__subtitle">{subtitle}</p>
          {quote ? (
            <blockquote className="dashboard-page__quote">
              <p className="dashboard-page__quote-text">“{quote}”</p>
              {quoteAttribution ? (
                <footer className="dashboard-page__quote-attr">
                  — {quoteAttribution}
                </footer>
              ) : null}
            </blockquote>
          ) : null}
          {introActions ? (
            <div className="dashboard-page__intro-actions">{introActions}</div>
          ) : null}
        </div>
        {hasAside ? (
          <div className="dashboard-page__header-aside">
            {roleLabel ? (
              <span
                className={
                  roleLabelTone === "pro-trial"
                    ? "dashboard-role-badge dashboard-role-badge--pro-trial"
                    : "dashboard-role-badge"
                }
              >
                {roleLabel}
              </span>
            ) : null}
            {statusLabel ? (
              <span
                className={`dashboard-profile-status dashboard-profile-status--${statusTone}`}
              >
                {statusLabel}
              </span>
            ) : null}
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

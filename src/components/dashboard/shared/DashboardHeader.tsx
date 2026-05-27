import type { ReactNode } from "react";

export interface DashboardHeaderProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  roleLabel?: string;
  actions?: ReactNode;
  introActions?: ReactNode;
}

export function DashboardHeader({
  eyebrow,
  title,
  subtitle,
  roleLabel,
  actions,
  introActions,
}: DashboardHeaderProps) {
  const hasAside = Boolean(roleLabel || actions);

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
          {introActions ? (
            <div className="dashboard-page__intro-actions">{introActions}</div>
          ) : null}
        </div>
        {hasAside ? (
          <div className="dashboard-page__header-aside">
            {roleLabel ? (
              <span className="dashboard-role-badge">{roleLabel}</span>
            ) : null}
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

import type { ReactNode } from "react";

export interface DashboardHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  roleLabel: string;
  actions?: ReactNode;
}

export function DashboardHeader({
  eyebrow,
  title,
  subtitle,
  roleLabel,
  actions,
}: DashboardHeaderProps) {
  return (
    <header className="dashboard-page__header">
      <div className="dashboard-page__header-row">
        <div>
          <p className="dashboard-page__eyebrow">{eyebrow}</p>
          <h1 className="dashboard-page__title">{title}</h1>
          <p className="dashboard-page__subtitle">{subtitle}</p>
        </div>
        <div className="dashboard-page__header-aside">
          <span className="dashboard-role-badge">{roleLabel}</span>
          {actions}
        </div>
      </div>
    </header>
  );
}

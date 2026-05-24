import type { ReactNode } from "react";
import { DashboardHeader } from "./DashboardHeader";

interface DashboardPageShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  roleLabel: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function DashboardPageShell({
  eyebrow,
  title,
  subtitle,
  roleLabel,
  actions,
  children,
}: DashboardPageShellProps) {
  return (
    <div className="dashboard-page">
      <div className="dashboard-page__canvas" aria-hidden>
        <div className="atmosphere-mesh">
          <div className="atmosphere-blob atmosphere-blob--indigo" />
          <div className="atmosphere-blob atmosphere-blob--blue" />
          <div className="atmosphere-blob atmosphere-blob--violet" />
          <div className="atmosphere-blob atmosphere-blob--magenta" />
          <div className="atmosphere-blob atmosphere-blob--core" />
        </div>
        <div className="dashboard-page__header-glow" />
        <div className="atmosphere-vignette atmosphere-vignette--soft" />
        <div className="atmosphere-grain" />
      </div>

      <div className="dashboard-page__content">
        <DashboardHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          roleLabel={roleLabel}
          actions={actions}
        />
        {children}
      </div>
    </div>
  );
}

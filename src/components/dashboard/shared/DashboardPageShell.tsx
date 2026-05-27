import type { ReactNode } from "react";
import { DashboardHeader } from "./DashboardHeader";

interface DashboardPageShellProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  roleLabel?: string;
  actions?: ReactNode;
  utilityBar?: ReactNode;
  introActions?: ReactNode;
  variant?: "default" | "client" | "admin" | "specialist";
  children: ReactNode;
}

export function DashboardPageShell({
  eyebrow,
  title,
  subtitle,
  roleLabel,
  actions,
  utilityBar,
  introActions,
  variant = "default",
  children,
}: DashboardPageShellProps) {
  const isClient = variant === "client";
  const isAdmin = variant === "admin";
  const isSpecialist = variant === "specialist";

  return (
    <div
      className={
        isClient
          ? "dashboard-page dashboard-page--client"
          : isAdmin
            ? "dashboard-page dashboard-page--admin"
            : isSpecialist
              ? "dashboard-page dashboard-page--specialist"
              : "dashboard-page"
      }
    >
      <div className="dashboard-page__canvas" aria-hidden>
        <div className="atmosphere-mesh">
          <div className="atmosphere-blob atmosphere-blob--indigo" />
          <div className="atmosphere-blob atmosphere-blob--blue" />
          <div className="atmosphere-blob atmosphere-blob--violet" />
          <div className="atmosphere-blob atmosphere-blob--magenta" />
          {isClient ? (
            <div className="atmosphere-blob atmosphere-blob--pink dashboard-page__blob--mint" />
          ) : null}
          <div className="atmosphere-blob atmosphere-blob--core" />
        </div>
        <div className="dashboard-page__header-glow" />
        {isClient ? <div className="dashboard-page__mid-glow" /> : null}
        <div className="atmosphere-vignette atmosphere-vignette--soft" />
        <div className="atmosphere-grain" />
      </div>

      <div className="dashboard-page__content">
        {utilityBar ? (
          <div className="dashboard-page__utility-bar">{utilityBar}</div>
        ) : null}
        <DashboardHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          roleLabel={roleLabel}
          actions={actions}
          introActions={introActions}
        />
        {children}
      </div>
    </div>
  );
}

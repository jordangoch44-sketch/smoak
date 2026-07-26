import type { ReactNode } from "react";
import { AdminCosmosBackdrop } from "@/components/admin/AdminCosmosBackdrop";
import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import type { AdminSectionId } from "@/lib/admin-sections";
import { DashboardHeader } from "./DashboardHeader";

interface DashboardPageShellProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  quote?: string;
  quoteAttribution?: string;
  roleLabel?: string;
  statusLabel?: string | null;
  statusTone?: "pending" | "active" | "rejected";
  actions?: ReactNode;
  utilityBar?: ReactNode;
  introActions?: ReactNode;
  variant?: "default" | "client" | "admin" | "specialist";
  /** Admin tab — drives milky-way dissolve between sky moods */
  adminSection?: AdminSectionId;
  children: ReactNode;
}

export function DashboardPageShell({
  eyebrow,
  title,
  subtitle,
  quote,
  quoteAttribution,
  roleLabel,
  statusLabel,
  statusTone = "pending",
  actions,
  utilityBar,
  introActions,
  variant = "default",
  adminSection = "overview",
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
      data-admin-section={isAdmin ? adminSection : undefined}
    >
      <div className="dashboard-page__canvas" aria-hidden>
        {isSpecialist ? (
          <div className="dashboard-page__specialist-cosmos">
            <AuroraAtmosphere
              intensity="medium"
              starDensity="light"
              glowPosition="header"
              glowColor="mixed"
              enableMotion
              className="dashboard-page__specialist-aurora"
            />
          </div>
        ) : isAdmin ? (
          <AdminCosmosBackdrop section={adminSection} />
        ) : (
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
        )}
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
          quote={quote}
          quoteAttribution={quoteAttribution}
          roleLabel={roleLabel}
          statusLabel={statusLabel}
          statusTone={statusTone}
          actions={actions}
          introActions={introActions}
        />
        {children}
      </div>
    </div>
  );
}

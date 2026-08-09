"use client";

import { useReducedMotion } from "framer-motion";
import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { ADMIN_SECTIONS, type AdminSectionId } from "@/lib/admin-sections";
import { cn } from "@/lib/utils";

interface AdminCosmosBackdropProps {
  section: AdminSectionId;
}

/**
 * Persistent starfield + CSS opacity washes per tab.
 * Mobile/tablet: light static sky + only the active wash (Safari OOM on scroll
 * when dense stars + all washes spanned the full document height).
 */
export function AdminCosmosBackdrop({ section }: AdminCosmosBackdropProps) {
  const reduceMotion = useReducedMotion();
  const isCompact = useTabletViewport(true);
  const enableMotion = !reduceMotion && !isCompact;
  const activeWash =
    ADMIN_SECTIONS.find((item) => item.id === section) ?? ADMIN_SECTIONS[0];

  return (
    <div className="dashboard-page__admin-cosmos" aria-hidden>
      <AuroraAtmosphere
        intensity="medium"
        starDensity={isCompact ? "light" : "dense"}
        glowPosition="none"
        enableMotion={enableMotion}
        className="dashboard-page__admin-aurora dashboard-page__admin-aurora--stars"
      />

      <div
        key={activeWash.id}
        className={cn(
          "dashboard-page__admin-wash",
          `dashboard-page__admin-wash--${activeWash.id}`,
          "dashboard-page__admin-wash--active"
        )}
      >
        <div className="dashboard-page__admin-milky-way" />
        <div className="dashboard-page__admin-nebula dashboard-page__admin-nebula--a" />
        <div className="dashboard-page__admin-nebula dashboard-page__admin-nebula--b" />
        <div className="dashboard-page__admin-nebula dashboard-page__admin-nebula--c" />
      </div>
    </div>
  );
}

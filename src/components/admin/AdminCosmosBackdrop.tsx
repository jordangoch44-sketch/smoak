"use client";

import { useReducedMotion } from "framer-motion";
import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";
import { ADMIN_SECTIONS, type AdminSectionId } from "@/lib/admin-sections";
import { cn } from "@/lib/utils";

interface AdminCosmosBackdropProps {
  section: AdminSectionId;
}

/**
 * Persistent starfield + CSS opacity washes per tab.
 * Never remounts the dense aurora (that caused choppy dissolves).
 */
export function AdminCosmosBackdrop({ section }: AdminCosmosBackdropProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="dashboard-page__admin-cosmos" aria-hidden>
      <AuroraAtmosphere
        intensity="medium"
        starDensity="dense"
        glowPosition="none"
        enableMotion={!reduceMotion}
        className="dashboard-page__admin-aurora dashboard-page__admin-aurora--stars"
      />

      {ADMIN_SECTIONS.map(({ id }) => (
        <div
          key={id}
          className={cn(
            "dashboard-page__admin-wash",
            `dashboard-page__admin-wash--${id}`,
            section === id && "dashboard-page__admin-wash--active"
          )}
        >
          <div className="dashboard-page__admin-milky-way" />
          <div className="dashboard-page__admin-nebula dashboard-page__admin-nebula--a" />
          <div className="dashboard-page__admin-nebula dashboard-page__admin-nebula--b" />
          <div className="dashboard-page__admin-nebula dashboard-page__admin-nebula--c" />
        </div>
      ))}
    </div>
  );
}

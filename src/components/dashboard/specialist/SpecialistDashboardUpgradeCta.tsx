"use client";

import { useState } from "react";
import {
  SMOAC_PRO_PRICE_LABEL,
  SMOAC_PRO_UNLOCK,
} from "@/lib/specialist-premium";
import {
  DashboardButton,
  SmoacProUpgradeModal,
} from "@/components/dashboard/shared";

const PRO_HIGHLIGHTS = [
  "Full profile analytics & views",
  "Ranking + visibility insights",
  "Growth trends & lead metrics",
] as const;

/**
 * Top-of-dashboard plan banner for free specialists.
 * Makes the current plan obvious and upgrading one tap.
 */
export function SpecialistDashboardUpgradeCta() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section
        className="specialist-dash-upgrade specialist-dash-upgrade--top"
        aria-labelledby="specialist-dash-upgrade-title"
      >
        <div className="specialist-dash-upgrade__plan-row">
          <span className="specialist-dash-upgrade__plan-chip">
            Free plan
          </span>
          <span className="specialist-dash-upgrade__price">
            Pro · {SMOAC_PRO_PRICE_LABEL}
          </span>
        </div>

        <div className="specialist-dash-upgrade__copy">
          <p
            id="specialist-dash-upgrade-title"
            className="specialist-dash-upgrade__title"
          >
            {SMOAC_PRO_UNLOCK.title}
          </p>
          <ul className="specialist-dash-upgrade__highlights">
            {PRO_HIGHLIGHTS.map((item) => (
              <li key={item} className="specialist-dash-upgrade__highlight">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <DashboardButton
          className="dashboard-pro-upgrade-btn specialist-dash-upgrade__cta"
          onClick={() => setOpen(true)}
        >
          {SMOAC_PRO_UNLOCK.cta}
        </DashboardButton>
      </section>

      <SmoacProUpgradeModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

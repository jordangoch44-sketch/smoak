"use client";

import { useState } from "react";
import { SMOAC_PRO_UNLOCK } from "@/lib/specialist-premium";
import {
  DashboardButton,
  SmoacProUpgradeModal,
} from "@/components/dashboard/shared";

export function SpecialistDashboardUpgradeCta() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section
        className="specialist-dash-upgrade"
        aria-labelledby="specialist-dash-upgrade-title"
      >
        <div className="specialist-dash-upgrade__copy">
          <p id="specialist-dash-upgrade-title" className="specialist-dash-upgrade__title">
            {SMOAC_PRO_UNLOCK.title}
          </p>
          <p className="specialist-dash-upgrade__text">
            {SMOAC_PRO_UNLOCK.description}
          </p>
        </div>
        <DashboardButton
          className="dashboard-pro-upgrade-btn specialist-dash-upgrade__btn"
          onClick={() => setOpen(true)}
        >
          {SMOAC_PRO_UNLOCK.cta}
        </DashboardButton>
      </section>

      <SmoacProUpgradeModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

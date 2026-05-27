"use client";

import { SMOAC_PRO_UNLOCK } from "@/lib/specialist-premium";
import { DashboardButton } from "./DashboardButton";

interface PremiumUnlockCtaProps {
  onUpgrade: () => void;
  className?: string;
}

export function PremiumUnlockCta({ onUpgrade, className }: PremiumUnlockCtaProps) {
  return (
    <div className={className ?? "dashboard-premium-unlock"}>
      <div className="dashboard-premium-unlock__glow" aria-hidden />
      <div className="dashboard-premium-unlock__copy">
        <p className="dashboard-premium-unlock__title">{SMOAC_PRO_UNLOCK.title}</p>
        <p className="dashboard-premium-unlock__text">{SMOAC_PRO_UNLOCK.description}</p>
      </div>
      <DashboardButton
        className="dashboard-pro-upgrade-btn"
        onClick={onUpgrade}
      >
        {SMOAC_PRO_UNLOCK.cta}
      </DashboardButton>
    </div>
  );
}

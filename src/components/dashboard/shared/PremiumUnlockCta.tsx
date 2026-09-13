"use client";

import { useAuthSession } from "@/hooks/useAuthSession";
import {
  isMembershipUpgradeOffer,
  resolveMembershipUpgradeOffer,
  SMOAC_PRO_UNLOCK,
} from "@/lib/specialist-premium";
import { DashboardButton } from "./DashboardButton";

interface PremiumUnlockCtaProps {
  onUpgrade: () => void;
  className?: string;
}

export function PremiumUnlockCta({ onUpgrade, className }: PremiumUnlockCtaProps) {
  const { session } = useAuthSession();
  const offer = resolveMembershipUpgradeOffer(session);
  const title = isMembershipUpgradeOffer(offer)
    ? offer.title
    : SMOAC_PRO_UNLOCK.title;
  const text = isMembershipUpgradeOffer(offer)
    ? offer.description
    : SMOAC_PRO_UNLOCK.description;
  const cta = isMembershipUpgradeOffer(offer) ? offer.cta : SMOAC_PRO_UNLOCK.cta;

  return (
    <div className={className ?? "dashboard-premium-unlock"}>
      <div className="dashboard-premium-unlock__glow" aria-hidden />
      <div className="dashboard-premium-unlock__copy">
        <p className="dashboard-premium-unlock__title">{title}</p>
        <p className="dashboard-premium-unlock__text">{text}</p>
      </div>
      <DashboardButton
        className="dashboard-pro-upgrade-btn"
        onClick={onUpgrade}
      >
        {cta}
      </DashboardButton>
    </div>
  );
}

"use client";

import { DashboardButton } from "@/components/dashboard/shared";
import { useAuthSession } from "@/hooks/useAuthSession";
import { listPriceCents } from "@/lib/stripe/products";
import {
  formatBoostPriceLabel,
  isProPlusPlan,
  PRO_PLUS_BOOST_PERCENT_OFF,
} from "@/lib/stripe/pro-plus-boost";

interface BoostProfileCardProps {
  onOpenBoost: () => void;
}

export function BoostProfileCard({ onOpenBoost }: BoostProfileCardProps) {
  const { session } = useAuthSession();
  const isProPlus = isProPlusPlan(session?.membershipPlan);
  const fromPrice = formatBoostPriceLabel(
    listPriceCents("boosted_profile"),
    isProPlus
  );

  return (
    <section className="dashboard-boost-cta" aria-labelledby="boost-profile-cta-title">
      <p className="dashboard-boost-cta__eyebrow">Paid placement</p>
      <h2 id="boost-profile-cta-title" className="dashboard-boost-cta__title">
        Boost your profile
      </h2>
      <p className="dashboard-boost-cta__body">
        This is what clients see. Put it on Marketplace Sponsored, in Search,
        or as Featured — labeled ads, separate from Pro.
      </p>
      <DashboardButton
        className="dashboard-boost-select-btn dashboard-boost-cta__btn"
        onClick={onOpenBoost}
      >
        Boost profile
      </DashboardButton>
      <p className="dashboard-boost-cta__note">
        From {fromPrice}
        {isProPlus ? ` · Pro Plus ${PRO_PLUS_BOOST_PERCENT_OFF}% off` : ""}
        {" · "}
        billed monthly · cancel anytime
      </p>
    </section>
  );
}

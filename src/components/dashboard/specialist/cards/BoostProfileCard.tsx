"use client";

import { DashboardButton } from "@/components/dashboard/shared";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  isProPlusPlan,
  PRO_PLUS_BOOST_PERCENT_OFF,
} from "@/lib/stripe/pro-plus-boost";

interface BoostProfileCardProps {
  onOpenBoost: () => void;
}

export function BoostProfileCard({ onOpenBoost }: BoostProfileCardProps) {
  const { session } = useAuthSession();
  const isProPlus = isProPlusPlan(session?.membershipPlan);

  return (
    <section className="dashboard-boost-cta" aria-labelledby="boost-profile-cta-title">
      <p className="dashboard-boost-cta__eyebrow">Paid placement</p>
      <h2 id="boost-profile-cta-title" className="dashboard-boost-cta__title">
        Boost your profile
      </h2>
      <p className="dashboard-boost-cta__body">
        Pick where you show up, set days and budget, then pay.
      </p>
      <DashboardButton
        className="dashboard-boost-select-btn dashboard-boost-cta__btn"
        onClick={onOpenBoost}
      >
        Boost profile
      </DashboardButton>
      <p className="dashboard-boost-cta__note">
        {isProPlus
          ? `Pro Plus ${PRO_PLUS_BOOST_PERCENT_OFF}% off · `
          : ""}
        pay for the days you choose
      </p>
    </section>
  );
}

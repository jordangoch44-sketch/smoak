"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { SmoacProUpgradeModal } from "@/components/dashboard/shared";
import {
  UpgradeCta,
  UpgradePerkList,
} from "@/components/dashboard/shared/MembershipUnlockPitch";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  MEMBERSHIP_PLAN_PICKER_TIERS,
  canSubscribeToMembershipPlan,
  currentMembershipPlanFromSession,
  formatMembershipShortLabel,
  membershipUpgradeOfferForProduct,
  type SpecialistMembershipPlan,
} from "@/lib/specialist-premium";
import type { SmoacMembershipProduct } from "@/lib/stripe/products";
import { cn } from "@/lib/utils";

interface SpecialistIgPlanSheetProps {
  open: boolean;
  onClose: () => void;
}

export function SpecialistIgPlanSheet({
  open,
  onClose,
}: SpecialistIgPlanSheetProps) {
  const titleId = useId();
  const { session } = useAuthSession();
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<SpecialistMembershipPlan>("free");
  const [upgradeProduct, setUpgradeProduct] =
    useState<SmoacMembershipProduct | null>(null);

  const currentPlan = currentMembershipPlanFromSession(session);
  const currentLabel = formatMembershipShortLabel(session);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setUpgradeProduct(null);
      return;
    }
    setSelected(currentPlan);
  }, [open, currentPlan]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !upgradeProduct) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, upgradeProduct, onClose]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const tier =
    MEMBERSHIP_PLAN_PICKER_TIERS.find((item) => item.id === selected) ??
    MEMBERSHIP_PLAN_PICKER_TIERS[0];
  const checkoutProduct = tier.product;
  const isCurrent = selected === currentPlan;
  const canUpgrade =
    Boolean(checkoutProduct) &&
    canSubscribeToMembershipPlan(session, selected);
  const offer = checkoutProduct
    ? membershipUpgradeOfferForProduct(checkoutProduct, session)
    : null;

  return createPortal(
    <>
      <div
        className="specialist-edit-profile-page specialist-edit-profile-page--plan"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="specialist-edit-profile-page__chrome">
          <FastActivateButton
            className="smoac-control specialist-edit-profile-page__back"
            aria-label="Back to edit profile"
            onActivate={onClose}
          >
            <ChevronLeftIcon className="specialist-edit-profile-page__back-icon" />
          </FastActivateButton>
          <h1 id={titleId} className="specialist-edit-profile-page__title">
            Plan
          </h1>
          <span className="specialist-edit-profile-page__spacer" aria-hidden />
        </header>

        <div className="specialist-edit-profile-page__body">
          <div className="ig-profile-edit specialist-ig-plan">
            <div className="specialist-ig-plan__current">
              <p className="ig-profile-edit__section-label">Current plan</p>
              <p className="specialist-ig-plan__current-name">{currentLabel}</p>
            </div>

            <div className="ig-profile-edit__section-label">Membership</div>
            <div
              className="specialist-ig-plan__tiers"
              role="tablist"
              aria-label="Membership plans"
            >
              {MEMBERSHIP_PLAN_PICKER_TIERS.map((item) => {
                const selectedTier = item.id === selected;
                const currentTier = item.id === currentPlan;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedTier}
                    className={cn(
                      "smoac-control specialist-ig-plan__tier",
                      selectedTier && "specialist-ig-plan__tier--selected",
                      currentTier && "specialist-ig-plan__tier--current"
                    )}
                    onClick={() => setSelected(item.id)}
                  >
                    <span className="specialist-ig-plan__tier-name">
                      {item.shortLabel}
                    </span>
                    <span className="specialist-ig-plan__tier-price">
                      {item.priceLabel}
                    </span>
                    {currentTier ? (
                      <span className="specialist-ig-plan__tier-status">
                        Current
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="specialist-ig-plan__detail">
              <p className="specialist-ig-plan__detail-eyebrow">{tier.label}</p>
              <h2 className="specialist-ig-plan__detail-title">
                {canUpgrade
                  ? isCurrent
                    ? "Keep this plan"
                    : "Upgrade"
                  : isCurrent
                    ? "Your plan"
                    : "Included"}
              </h2>
              <p className="specialist-ig-plan__detail-copy">{tier.description}</p>
              <UpgradePerkList benefits={tier.benefits} />
              {canUpgrade && offer && checkoutProduct ? (
                <UpgradeCta onClick={() => setUpgradeProduct(checkoutProduct)}>
                  {offer.cta}
                </UpgradeCta>
              ) : isCurrent ? (
                <p className="specialist-ig-plan__status">This is your current plan.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <SmoacProUpgradeModal
        open={Boolean(upgradeProduct)}
        product={upgradeProduct ?? undefined}
        onClose={() => setUpgradeProduct(null)}
      />
    </>,
    document.body
  );
}

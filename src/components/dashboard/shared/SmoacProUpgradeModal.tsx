"use client";

import { useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  CalendarIcon,
  CameraIcon,
  ChartIcon,
  CheckCircleIcon,
  CheckIcon,
  EyeIcon,
  PercentIcon,
  PhotosStackIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/useAuthSession";
import { LOGO_ICON_SRC } from "@/lib/brand";
import { MODAL_OPEN_BODY_CLASS } from "@/lib/blocking-modal";
import {
  isMembershipUpgradeOffer,
  resolveMembershipUpgradeOffer,
  type MembershipUpgradeOffer,
} from "@/lib/specialist-premium";
import { createEmbeddedSubscriptionCheckout } from "@/lib/stripe/subscription-checkout";
import type { SmoacMembershipProduct } from "@/lib/stripe/products";
import { cn } from "@/lib/utils";
import { BoostVisibilityModal } from "./BoostVisibilityModal";
import { DashboardButton } from "./DashboardButton";
import {
  DASHBOARD_MODAL_DIALOG_POINTER_PROPS,
  DashboardModalCloseButton,
  DashboardModalScrim,
} from "./DashboardModalScrim";
import { StripeEmbeddedCheckout } from "./StripeEmbeddedCheckout";

const PERK_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "Full profile analytics": ChartIcon,
  "Visibility and ranking intelligence": TrophyIcon,
  "Client engagement metrics": UsersIcon,
  "Free 1st session marketplace placement": CalendarIcon,
  "Growth insights on your live profile": EyeIcon,
  "Everything in Pro": CheckCircleIcon,
  "Phone videos up to 45 seconds": CameraIcon,
  "Client results under Specialties": PhotosStackIcon,
  "20% off Boost campaigns": PercentIcon,
};

function UpgradeMark() {
  return (
    <span className="dashboard-upgrade__mark" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- official plate crop, paints with the modal */}
      <img
        src={LOGO_ICON_SRC}
        alt=""
        width={86}
        height={86}
        decoding="sync"
        fetchPriority="high"
        className="dashboard-upgrade__s"
      />
    </span>
  );
}

interface SmoacProUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Force the trial-ended Pro continue prompt. */
  trialEnded?: boolean;
}

type CheckoutPayload = {
  clientSecret: string;
  product: SmoacMembershipProduct;
  label: string;
  priceLabel: string;
};

type Step = "pick" | "checkout" | "paid";

function splitPriceLabel(label: string): { amount: string; cadence: string } {
  const slash = label.lastIndexOf("/");
  if (slash <= 0) return { amount: label, cadence: "" };
  return {
    amount: label.slice(0, slash).trim(),
    cadence: `/${label.slice(slash + 1).trim()}`,
  };
}

function MembershipUpgradePick({
  offer,
  busy,
  error,
  onCheckout,
  onClose,
}: {
  offer: MembershipUpgradeOffer;
  busy: boolean;
  error: string | null;
  onCheckout: () => void;
  onClose: () => void;
}) {
  const price = splitPriceLabel(offer.price);

  return (
    <div className="dashboard-upgrade">
      <div className="dashboard-upgrade__hero">
        <UpgradeMark />
        <p className="dashboard-modal__eyebrow dashboard-upgrade__eyebrow">
          {offer.eyebrow}
        </p>
        <h2 id="smoac-pro-modal-title" className="dashboard-upgrade__title">
          {offer.title}
        </h2>
        <p id="smoac-pro-modal-desc" className="dashboard-upgrade__body">
          {offer.description}
        </p>
      </div>

      <div className="dashboard-upgrade__price-card">
        <p className="dashboard-upgrade__price">
          <span className="dashboard-upgrade__amount">{price.amount}</span>
          {price.cadence ? (
            <span className="dashboard-upgrade__cadence">{price.cadence}</span>
          ) : null}
        </p>
        <p className="dashboard-upgrade__billing">{offer.note}</p>
      </div>

      <ul className="dashboard-upgrade__perks">
        {offer.benefits.map((benefit) => {
          const PerkIcon = PERK_ICONS[benefit] ?? CheckIcon;
          return (
            <li key={benefit}>
              <span className="dashboard-upgrade__perk-icon-wrap" aria-hidden>
                <PerkIcon className="dashboard-upgrade__perk-icon" />
              </span>
              <span>{benefit}</span>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p className="dashboard-modal__error" role="alert">
          {error}
        </p>
      ) : null}

      <DashboardButton
        className="dashboard-pro-upgrade-btn dashboard-upgrade__cta"
        onClick={onCheckout}
        disabled={busy}
      >
        {busy ? "Loading…" : offer.cta}
      </DashboardButton>
      {offer.secondaryCta ? (
        <FastActivateButton
          className="dashboard-modal__secondary"
          onActivate={onClose}
        >
          {offer.secondaryCta}
        </FastActivateButton>
      ) : null}
    </div>
  );
}

export function SmoacProUpgradeModal({
  open,
  onClose,
  trialEnded = false,
}: SmoacProUpgradeModalProps) {
  const { session } = useAuthSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const offer = resolveMembershipUpgradeOffer(session, { trialEnded });
  const offersBoost = offer.intent === "boost";

  useEffect(() => {
    if (!open || offersBoost) return;

    document.body.classList.add(MODAL_OPEN_BODY_CLASS);
    document.documentElement.classList.add(MODAL_OPEN_BODY_CLASS);
    setError(null);
    setBusy(false);
    setCheckout(null);
    setStep("pick");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove(MODAL_OPEN_BODY_CLASS);
      document.documentElement.classList.remove(MODAL_OPEN_BODY_CLASS);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, offersBoost]);

  if (!open || typeof document === "undefined") return null;

  if (!isMembershipUpgradeOffer(offer)) {
    return <BoostVisibilityModal open={open} onClose={onClose} />;
  }

  async function startCheckout() {
    if (!isMembershipUpgradeOffer(offer)) return;
    setBusy(true);
    setError(null);
    const result = await createEmbeddedSubscriptionCheckout(offer.product);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setCheckout({
      clientSecret: result.checkout.clientSecret,
      product: offer.product,
      label: result.checkout.label,
      priceLabel: result.checkout.priceLabel,
    });
    setStep("checkout");
    setBusy(false);
  }

  function backToPick() {
    setCheckout(null);
    setError(null);
    setStep("pick");
  }

  const dialogClass = cn(
    "dashboard-modal__dialog dashboard-modal__dialog--pro dashboard-modal__dialog--upgrade",
    `dashboard-modal__dialog--upgrade-${offer.tone}`
  );

  return createPortal(
    <DashboardModalScrim
      className={`dashboard-modal--upgrade dashboard-modal--upgrade-${offer.tone}`}
      onDismiss={onClose}
    >
      <div
        className={dialogClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="smoac-pro-modal-title"
        aria-describedby="smoac-pro-modal-desc"
        {...DASHBOARD_MODAL_DIALOG_POINTER_PROPS}
      >
        <div
          className={cn(
            "dashboard-modal__glow dashboard-upgrade__glow",
            `dashboard-upgrade__glow--${offer.tone}`
          )}
          aria-hidden
        />

        <DashboardModalCloseButton onClose={onClose} />

        <div className="dashboard-modal__content dashboard-upgrade-content">
          {step === "pick" ? (
            <MembershipUpgradePick
              offer={offer}
              busy={busy}
              error={error}
              onCheckout={() => void startCheckout()}
              onClose={onClose}
            />
          ) : null}

          {step === "checkout" && checkout ? (
            <div className="dashboard-upgrade">
              <FastActivateButton
                className="dashboard-modal__secondary dashboard-upgrade__back"
                onActivate={backToPick}
              >
                ← Back
              </FastActivateButton>
              <p className="dashboard-modal__eyebrow dashboard-upgrade__eyebrow">
                {offer.eyebrow}
              </p>
              <h2 id="smoac-pro-modal-title" className="dashboard-upgrade__title">
                {checkout.label}
              </h2>
              <p id="smoac-pro-modal-desc" className="dashboard-upgrade__body">
                Pay in one tap, or enter a card. Billed monthly. Cancel anytime
                from Subscription settings.
              </p>
              <p className="dashboard-upgrade__price dashboard-upgrade__price--inline">
                <span className="dashboard-upgrade__amount">
                  {splitPriceLabel(checkout.priceLabel).amount}
                </span>
                {splitPriceLabel(checkout.priceLabel).cadence ? (
                  <span className="dashboard-upgrade__cadence">
                    {splitPriceLabel(checkout.priceLabel).cadence}
                  </span>
                ) : null}
              </p>
              {error ? (
                <p className="dashboard-modal__error" role="alert">
                  {error}
                </p>
              ) : null}
              <StripeEmbeddedCheckout
                clientSecret={checkout.clientSecret}
                productLabel={checkout.label}
                priceLabel={checkout.priceLabel}
                onPaid={() => setStep("paid")}
                onError={(message) => setError(message || null)}
              />
            </div>
          ) : null}

          {step === "paid" ? (
            <div className="dashboard-upgrade">
              <UpgradeMark />
              <p className="dashboard-modal__eyebrow dashboard-upgrade__eyebrow">
                {offer.eyebrow}
              </p>
              <h2 id="smoac-pro-modal-title" className="dashboard-upgrade__title">
                {checkout?.label ?? "Pro"} is active
              </h2>
              <p id="smoac-pro-modal-desc" className="dashboard-upgrade__body">
                Your plan will unlock shortly. Manage billing anytime in
                Subscription / account settings.
              </p>
              <DashboardButton
                className="dashboard-pro-upgrade-btn dashboard-upgrade__cta"
                onClick={onClose}
              >
                Done
              </DashboardButton>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardModalScrim>,
    document.body
  );
}

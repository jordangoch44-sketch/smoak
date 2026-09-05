"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { SMOAC_PRO_TRIAL_ENDED_MODAL } from "@/lib/specialist-premium";
import { createEmbeddedSubscriptionCheckout } from "@/lib/stripe/subscription-checkout";
import { DashboardButton } from "./DashboardButton";
import { StripeEmbeddedCheckout } from "./StripeEmbeddedCheckout";

interface PremiumTrialEndedModalProps {
  open: boolean;
  onClose: () => void;
}

type CheckoutPayload = {
  clientSecret: string;
  label: string;
  priceLabel: string;
};

type Step = "prompt" | "checkout" | "paid";

/**
 * Day-30 notice: complimentary Pro ended → free tier + option to continue at $9.99.
 */
export function PremiumTrialEndedModal({
  open,
  onClose,
}: PremiumTrialEndedModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("prompt");
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setError(null);
    setBusy(false);
    setCheckout(null);
    setStep("prompt");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  async function continuePro() {
    setBusy(true);
    setError(null);
    const result = await createEmbeddedSubscriptionCheckout("premium");
    if (!result.ok) {
      setError(
        result.error === "Checkout is not available yet."
          ? "Checkout isn’t available yet. You can upgrade when Stripe is connected."
          : result.error
      );
      setBusy(false);
      return;
    }
    setCheckout({
      clientSecret: result.checkout.clientSecret,
      label: result.checkout.label,
      priceLabel: result.checkout.priceLabel,
    });
    setStep("checkout");
    setBusy(false);
  }

  function backToPrompt() {
    setCheckout(null);
    setError(null);
    setStep("prompt");
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="dashboard-modal" role="presentation" onClick={onClose}>
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--pro"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-ended-title"
        aria-describedby="trial-ended-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-modal__glow" aria-hidden />
        <button
          type="button"
          className="dashboard-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
        <div className="dashboard-modal__content">
          {step === "prompt" ? (
            <>
              <p className="dashboard-modal__eyebrow">
                {SMOAC_PRO_TRIAL_ENDED_MODAL.eyebrow}
              </p>
              <h2 id="trial-ended-title" className="dashboard-modal__title">
                {SMOAC_PRO_TRIAL_ENDED_MODAL.title}
              </h2>
              <p id="trial-ended-desc" className="dashboard-modal__body">
                {SMOAC_PRO_TRIAL_ENDED_MODAL.description}
              </p>
              <p className="dashboard-modal__price">
                {SMOAC_PRO_TRIAL_ENDED_MODAL.price}
              </p>
              <p className="dashboard-modal__note">
                {SMOAC_PRO_TRIAL_ENDED_MODAL.note}
              </p>
              {error ? (
                <p className="dashboard-modal__error" role="alert">
                  {error}
                </p>
              ) : null}
              <DashboardButton
                className="dashboard-pro-upgrade-btn"
                onClick={() => void continuePro()}
                disabled={busy}
              >
                {busy ? "Loading…" : SMOAC_PRO_TRIAL_ENDED_MODAL.primaryCta}
              </DashboardButton>
              <button
                type="button"
                className="dashboard-modal__secondary"
                onClick={onClose}
              >
                {SMOAC_PRO_TRIAL_ENDED_MODAL.secondaryCta}
              </button>
            </>
          ) : null}

          {step === "checkout" && checkout ? (
            <>
              <button
                type="button"
                className="dashboard-modal__secondary"
                onClick={backToPrompt}
              >
                ← Back
              </button>
              <p className="dashboard-modal__eyebrow">
                {SMOAC_PRO_TRIAL_ENDED_MODAL.eyebrow}
              </p>
              <h2 id="trial-ended-title" className="dashboard-modal__title">
                {checkout.label}
              </h2>
              <p id="trial-ended-desc" className="dashboard-modal__body">
                Pay in one tap, or enter a card. Billed monthly.
              </p>
              <p className="dashboard-modal__price">{checkout.priceLabel}</p>
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
            </>
          ) : null}

          {step === "paid" ? (
            <>
              <p className="dashboard-modal__eyebrow">
                {SMOAC_PRO_TRIAL_ENDED_MODAL.eyebrow}
              </p>
              <h2 id="trial-ended-title" className="dashboard-modal__title">
                Pro is active
              </h2>
              <p id="trial-ended-desc" className="dashboard-modal__body">
                Your plan will unlock shortly. Manage billing anytime in
                Subscription / account settings.
              </p>
              <DashboardButton
                className="dashboard-pro-upgrade-btn"
                onClick={onClose}
              >
                Done
              </DashboardButton>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

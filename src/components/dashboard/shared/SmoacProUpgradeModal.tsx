"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import {
  SMOAC_PRO_PLUS_PRICE_LABEL,
  SMOAC_PRO_UPGRADE_MODAL,
} from "@/lib/specialist-premium";
import { createEmbeddedSubscriptionCheckout } from "@/lib/stripe/subscription-checkout";
import type { SmoacMembershipProduct } from "@/lib/stripe/products";
import { DashboardButton } from "./DashboardButton";
import { StripeEmbeddedCheckout } from "./StripeEmbeddedCheckout";

interface SmoacProUpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

type CheckoutPayload = {
  clientSecret: string;
  product: SmoacMembershipProduct;
  label: string;
  priceLabel: string;
};

type Step = "pick" | "checkout" | "paid";

export function SmoacProUpgradeModal({ open, onClose }: SmoacProUpgradeModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setError(null);
    setBusy(false);
    setCheckout(null);
    setStep("pick");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  async function startCheckout(product: SmoacMembershipProduct) {
    setBusy(true);
    setError(null);
    const result = await createEmbeddedSubscriptionCheckout(product);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setCheckout({
      clientSecret: result.checkout.clientSecret,
      product,
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

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="dashboard-modal" role="presentation" onClick={onClose}>
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--pro"
        role="dialog"
        aria-modal="true"
        aria-labelledby="smoac-pro-modal-title"
        aria-describedby="smoac-pro-modal-desc"
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
          {step === "pick" ? (
            <>
              <p className="dashboard-modal__eyebrow">{SMOAC_PRO_UPGRADE_MODAL.eyebrow}</p>
              <h2 id="smoac-pro-modal-title" className="dashboard-modal__title">
                {SMOAC_PRO_UPGRADE_MODAL.title}
              </h2>
              <p id="smoac-pro-modal-desc" className="dashboard-modal__body">
                {SMOAC_PRO_UPGRADE_MODAL.description}
              </p>
              <p className="dashboard-modal__price">{SMOAC_PRO_UPGRADE_MODAL.price}</p>
              <p className="dashboard-modal__note">{SMOAC_PRO_UPGRADE_MODAL.note}</p>
              {error ? (
                <p className="dashboard-modal__error" role="alert">
                  {error}
                </p>
              ) : null}
              <DashboardButton
                className="dashboard-pro-upgrade-btn"
                onClick={() => void startCheckout("premium")}
                disabled={busy}
              >
                {busy ? "Loading…" : `Continue Pro · ${SMOAC_PRO_UPGRADE_MODAL.price}`}
              </DashboardButton>
              <button
                type="button"
                className="dashboard-modal__secondary"
                onClick={() => void startCheckout("platinum")}
                disabled={busy}
              >
                Or Pro Plus · {SMOAC_PRO_PLUS_PRICE_LABEL}
              </button>
              <p className="dashboard-modal__note">
                Pro Plus adds client transformations under your pins and 20% off
                Boosts. Pay with Apple Pay, Google Pay, Link, or card.
              </p>
            </>
          ) : null}

          {step === "checkout" && checkout ? (
            <>
              <button
                type="button"
                className="dashboard-modal__secondary"
                onClick={backToPick}
              >
                ← Back to plans
              </button>
              <p className="dashboard-modal__eyebrow">{SMOAC_PRO_UPGRADE_MODAL.eyebrow}</p>
              <h2 id="smoac-pro-modal-title" className="dashboard-modal__title">
                {checkout.label}
              </h2>
              <p id="smoac-pro-modal-desc" className="dashboard-modal__body">
                Pay in one tap, or enter a card. Billed monthly. Cancel anytime
                from Subscription settings.
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
              <p className="dashboard-modal__eyebrow">{SMOAC_PRO_UPGRADE_MODAL.eyebrow}</p>
              <h2 id="smoac-pro-modal-title" className="dashboard-modal__title">
                {checkout?.label ?? "Pro"} is active
              </h2>
              <p id="smoac-pro-modal-desc" className="dashboard-modal__body">
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

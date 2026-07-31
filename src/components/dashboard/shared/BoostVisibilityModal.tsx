"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { DashboardButton } from "@/components/dashboard/shared/DashboardButton";
import { StripeEmbeddedCheckout } from "@/components/dashboard/shared/StripeEmbeddedCheckout";
import {
  BOOST_PRODUCT_OPTIONS,
  productDescription,
  productLabel,
  type SmoacAddonProduct,
} from "@/lib/stripe/products";

interface BoostVisibilityModalProps {
  open: boolean;
  onClose: () => void;
}

type CheckoutPayload = {
  clientSecret: string;
  product: SmoacAddonProduct;
  label: string;
  description: string;
  priceLabel: string;
};

/**
 * Boost flow: pick placement → see what you gain → enter card in-modal (Stripe).
 */
export function BoostVisibilityModal({
  open,
  onClose,
}: BoostVisibilityModalProps) {
  const [selected, setSelected] = useState<SmoacAddonProduct | null>(null);
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setSelected(null);
    setCheckout(null);
    setError(null);
    setBusy(false);
    setPaid(false);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  async function startEmbeddedCheckout(product: SmoacAddonProduct) {
    setSelected(product);
    setBusy(true);
    setError(null);
    setCheckout(null);
    setPaid(false);
    try {
      const res = await fetch("/api/stripe/subscription-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      const data = (await res.json()) as CheckoutPayload & { error?: string };
      if (!res.ok || !data.clientSecret) {
        setError(data.error ?? "Checkout is not available yet.");
        setSelected(null);
        return;
      }
      setCheckout({
        clientSecret: data.clientSecret,
        product: data.product,
        label: data.label,
        description: data.description,
        priceLabel: data.priceLabel,
      });
    } catch {
      setError("Could not start checkout. Try again.");
      setSelected(null);
    } finally {
      setBusy(false);
    }
  }

  function backToList() {
    setCheckout(null);
    setSelected(null);
    setError(null);
    setPaid(false);
  }

  if (!open || typeof document === "undefined") return null;

  const selectedMeta = selected
    ? BOOST_PRODUCT_OPTIONS.find((o) => o.key === selected)
    : null;

  return createPortal(
    <div className="dashboard-modal" role="presentation" onClick={onClose}>
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--boost"
        role="dialog"
        aria-modal="true"
        aria-labelledby="boost-modal-title"
        aria-describedby="boost-modal-desc"
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
          {!checkout && !paid ? (
            <>
              <p className="dashboard-modal__eyebrow">Paid placement</p>
              <h2 id="boost-modal-title" className="dashboard-modal__title">
                Boost profile & ads
              </h2>
              <p id="boost-modal-desc" className="dashboard-modal__body">
                Choose a placement, review what you get, then subscribe with
                your card — without leaving SMOAC.
              </p>

              <ul className="dashboard-boost-list">
                {BOOST_PRODUCT_OPTIONS.map((option) => (
                  <li key={option.key} className="dashboard-boost-list__item">
                    <div className="dashboard-boost-list__copy">
                      <p className="dashboard-boost-list__label">
                        {option.label}
                      </p>
                      <p className="dashboard-boost-list__desc">
                        {option.description}
                      </p>
                      <p className="dashboard-boost-list__price">
                        {option.priceLabel}
                      </p>
                    </div>
                    <DashboardButton
                      inline
                      onClick={() => void startEmbeddedCheckout(option.key)}
                      disabled={busy}
                    >
                      {busy && selected === option.key
                        ? "Loading…"
                        : "Select"}
                    </DashboardButton>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {checkout && !paid ? (
            <>
              <button
                type="button"
                className="dashboard-modal__secondary"
                onClick={backToList}
              >
                ← All boosts
              </button>
              <p className="dashboard-modal__eyebrow">You’re subscribing to</p>
              <h2 id="boost-modal-title" className="dashboard-modal__title">
                {checkout.label}
              </h2>
              <p id="boost-modal-desc" className="dashboard-modal__body">
                {checkout.description ||
                  productDescription(checkout.product) ||
                  selectedMeta?.description}
              </p>
              <p className="dashboard-modal__price">{checkout.priceLabel}</p>
              <p className="dashboard-modal__note">
                Billed monthly. Cancel anytime from Subscription / account
                settings. Placement turns on after payment succeeds.
              </p>

              <div className="dashboard-boost-checkout">
                <p className="dashboard-boost-checkout__label">
                  Payment details
                </p>
                <StripeEmbeddedCheckout
                  clientSecret={checkout.clientSecret}
                  productLabel={checkout.label}
                  priceLabel={checkout.priceLabel}
                  onPaid={() => setPaid(true)}
                  onError={(message) => setError(message || null)}
                />
              </div>
            </>
          ) : null}

          {paid ? (
            <>
              <p className="dashboard-modal__eyebrow">You’re live</p>
              <h2 id="boost-modal-title" className="dashboard-modal__title">
                {checkout?.label ?? productLabel(selected!)} is active
              </h2>
              <p id="boost-modal-desc" className="dashboard-modal__body">
                Your placement will appear on SMOAC shortly. Track ad spend and
                manage billing anytime in Subscription / account settings.
              </p>
              <DashboardButton onClick={onClose}>Done</DashboardButton>
            </>
          ) : null}

          {error ? (
            <p className="dashboard-modal__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

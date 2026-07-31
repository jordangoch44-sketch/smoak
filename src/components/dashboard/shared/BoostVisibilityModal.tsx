"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { DashboardButton } from "@/components/dashboard/shared/DashboardButton";
import {
  BOOST_PRODUCT_OPTIONS,
  type SmoacAddonProduct,
} from "@/lib/stripe/products";

interface BoostVisibilityModalProps {
  open: boolean;
  onClose: () => void;
}

export function BoostVisibilityModal({
  open,
  onClose,
}: BoostVisibilityModalProps) {
  const [busyKey, setBusyKey] = useState<SmoacAddonProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setError(null);
    setBusyKey(null);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  async function startCheckout(product: SmoacAddonProduct) {
    setBusyKey(product);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout is not available yet.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start checkout. Try again.");
    } finally {
      setBusyKey(null);
    }
  }

  if (!open || typeof document === "undefined") return null;

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
          <p className="dashboard-modal__eyebrow">Paid placement</p>
          <h2 id="boost-modal-title" className="dashboard-modal__title">
            Boost profile & ads
          </h2>
          <p id="boost-modal-desc" className="dashboard-modal__body">
            Optional placements separate from SMOAC Pro. Pro never includes
            Sponsored — boosts set placement only.
          </p>

          <ul className="dashboard-boost-list">
            {BOOST_PRODUCT_OPTIONS.map((option) => (
              <li key={option.key} className="dashboard-boost-list__item">
                <div className="dashboard-boost-list__copy">
                  <p className="dashboard-boost-list__label">{option.label}</p>
                  <p className="dashboard-boost-list__desc">
                    {option.description}
                  </p>
                  <p className="dashboard-boost-list__price">{option.priceLabel}</p>
                </div>
                <DashboardButton
                  inline
                  onClick={() => void startCheckout(option.key)}
                  disabled={busyKey !== null}
                >
                  {busyKey === option.key ? "Opening…" : "Subscribe"}
                </DashboardButton>
              </li>
            ))}
          </ul>

          {error ? (
            <p className="dashboard-modal__error" role="alert">
              {error}
            </p>
          ) : null}

          <p className="dashboard-modal__note">
            Billed monthly via Stripe. Manage or cancel anytime in billing.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

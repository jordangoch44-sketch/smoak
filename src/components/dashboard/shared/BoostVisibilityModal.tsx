"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthSession } from "@/hooks/useAuthSession";
import { CloseIcon } from "@/components/ui/icons";
import { DashboardButton } from "@/components/dashboard/shared/DashboardButton";
import { StripeEmbeddedCheckout } from "@/components/dashboard/shared/StripeEmbeddedCheckout";
import {
  BOOST_PRODUCT_DETAILS,
  getBoostProductDetail,
  type BoostProductDetail,
} from "@/lib/boost-product-details";
import {
  listPriceCents,
  productDescription,
  type SmoacAddonProduct,
} from "@/lib/stripe/products";
import {
  formatBoostPriceLabel,
  isProPlusPlan,
  PRO_PLUS_BOOST_PERCENT_OFF,
} from "@/lib/stripe/pro-plus-boost";

interface BoostVisibilityModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional: land on a specific boost detail (e.g. rankings promo) */
  initialProduct?: SmoacAddonProduct | null;
}

type CheckoutPayload = {
  clientSecret: string;
  product: SmoacAddonProduct;
  label: string;
  description: string;
  priceLabel: string;
};

type Step = "list" | "detail" | "checkout" | "paid";

/**
 * Boost flow: pick placement → full details → card in-modal (Stripe).
 * Neon yellow theme — distinct from Pro (purple) and Pro trial (blue).
 */
export function BoostVisibilityModal({
  open,
  onClose,
  initialProduct = null,
}: BoostVisibilityModalProps) {
  const { session } = useAuthSession();
  const isProPlus = isProPlusPlan(session?.membershipPlan);
  const [step, setStep] = useState<Step>("list");
  const [detail, setDetail] = useState<BoostProductDetail | null>(null);
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function priceFor(key: SmoacAddonProduct) {
    const listCents = listPriceCents(key);
    return {
      listLabel: formatBoostPriceLabel(listCents, false),
      payLabel: formatBoostPriceLabel(listCents, isProPlus),
    };
  }

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setCheckout(null);
    setError(null);
    setBusy(false);

    if (initialProduct) {
      setDetail(getBoostProductDetail(initialProduct));
      setStep("detail");
    } else {
      setDetail(null);
      setStep("list");
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, initialProduct]);

  async function startEmbeddedCheckout(product: SmoacAddonProduct) {
    setBusy(true);
    setError(null);
    setCheckout(null);
    try {
      const res = await fetch("/api/stripe/subscription-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      const data = (await res.json()) as CheckoutPayload & { error?: string };
      if (!res.ok || !data.clientSecret) {
        setError(data.error ?? "Checkout is not available yet.");
        return;
      }
      setCheckout({
        clientSecret: data.clientSecret,
        product: data.product,
        label: data.label,
        description: data.description,
        priceLabel: data.priceLabel,
      });
      setStep("checkout");
    } catch {
      setError("Could not start checkout. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function openDetail(item: BoostProductDetail) {
    setDetail(item);
    setError(null);
    setStep("detail");
  }

  function backToList() {
    setCheckout(null);
    setDetail(null);
    setError(null);
    setStep("list");
  }

  function backToDetail() {
    setCheckout(null);
    setError(null);
    setStep("detail");
  }

  if (!open || typeof document === "undefined") return null;

  const activeDetail =
    detail ??
    (checkout ? getBoostProductDetail(checkout.product) : null);

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
        <div className="dashboard-modal__glow dashboard-modal__glow--boost" aria-hidden />

        <button
          type="button"
          className="dashboard-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="dashboard-modal__content">
          {step === "list" ? (
            <>
              <p className="dashboard-modal__eyebrow dashboard-modal__eyebrow--boost">
                Paid placement
              </p>
              <h2 id="boost-modal-title" className="dashboard-modal__title">
                Boost profile & ads
              </h2>
              <p id="boost-modal-desc" className="dashboard-modal__body">
                Pick a placement to see exactly what you get, where it appears,
                and what it will not change. Separate from Pro analytics —
                billed monthly, cancel anytime.
                {isProPlus
                  ? ` Pro Plus saves ${PRO_PLUS_BOOST_PERCENT_OFF}% on every Boost.`
                  : ""}
              </p>

              <ul className="dashboard-boost-list">
                {BOOST_PRODUCT_DETAILS.map((option) => {
                  const price = priceFor(option.key);
                  return (
                  <li key={option.key} className="dashboard-boost-list__item">
                    <div className="dashboard-boost-list__copy">
                      <p className="dashboard-boost-list__label">
                        {option.label}
                      </p>
                      <p className="dashboard-boost-list__desc">
                        {option.tagline}
                      </p>
                      <p className="dashboard-boost-list__price">
                        {isProPlus ? (
                          <>
                            <span className="dashboard-boost-list__price-was">
                              {price.listLabel}
                            </span>
                            {price.payLabel}
                          </>
                        ) : (
                          price.payLabel
                        )}
                      </p>
                    </div>
                    <DashboardButton
                      inline
                      className="dashboard-boost-select-btn"
                      onClick={() => openDetail(option)}
                    >
                      Details
                    </DashboardButton>
                  </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          {step === "detail" && activeDetail ? (
            <>
              <button
                type="button"
                className="dashboard-modal__secondary"
                onClick={backToList}
              >
                ← All boosts
              </button>
              <p className="dashboard-modal__eyebrow dashboard-modal__eyebrow--boost">
                {isProPlus
                  ? `${priceFor(activeDetail.key).payLabel} · Pro Plus 20% off`
                  : activeDetail.priceLabel}
              </p>
              <h2 id="boost-modal-title" className="dashboard-modal__title">
                {activeDetail.label}
              </h2>
              <p id="boost-modal-desc" className="dashboard-modal__body">
                {activeDetail.tagline}
              </p>

              <div className="dashboard-boost-detail">
                <section className="dashboard-boost-detail__block">
                  <h3 className="dashboard-boost-detail__heading">You get</h3>
                  <ul className="dashboard-boost-detail__list">
                    {activeDetail.youGet.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
                <section className="dashboard-boost-detail__block">
                  <h3 className="dashboard-boost-detail__heading">
                    Where it appears
                  </h3>
                  <ul className="dashboard-boost-detail__list">
                    {activeDetail.appearsOn.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
                <section className="dashboard-boost-detail__block dashboard-boost-detail__block--wont">
                  <h3 className="dashboard-boost-detail__heading">
                    What it will not do
                  </h3>
                  <ul className="dashboard-boost-detail__list">
                    {activeDetail.willNot.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <p className="dashboard-modal__note">
                Billed monthly. Placement turns on after payment succeeds.
                Manage billing anytime in Subscription settings.
              </p>

              <DashboardButton
                className="dashboard-boost-select-btn"
                onClick={() => void startEmbeddedCheckout(activeDetail.key)}
                disabled={busy}
              >
                {busy
                  ? "Loading…"
                  : `Continue · ${priceFor(activeDetail.key).payLabel}`}
              </DashboardButton>
            </>
          ) : null}

          {step === "checkout" && checkout ? (
            <>
              <button
                type="button"
                className="dashboard-modal__secondary"
                onClick={backToDetail}
              >
                ← Back to details
              </button>
              <p className="dashboard-modal__eyebrow dashboard-modal__eyebrow--boost">
                You’re subscribing to
              </p>
              <h2 id="boost-modal-title" className="dashboard-modal__title">
                {checkout.label}
              </h2>
              <p id="boost-modal-desc" className="dashboard-modal__body">
                {checkout.description ||
                  productDescription(checkout.product) ||
                  activeDetail?.tagline}
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
                  onPaid={() => setStep("paid")}
                  onError={(message) => setError(message || null)}
                />
              </div>
            </>
          ) : null}

          {step === "paid" ? (
            <>
              <p className="dashboard-modal__eyebrow dashboard-modal__eyebrow--boost">
                You’re live
              </p>
              <h2 id="boost-modal-title" className="dashboard-modal__title">
                {checkout?.label ?? detail?.label ?? "Boost"} is active
              </h2>
              <p id="boost-modal-desc" className="dashboard-modal__body">
                Your placement will appear on SMOAC shortly. Track ad spend and
                manage billing anytime in Subscription / account settings.
              </p>
              <DashboardButton
                className="dashboard-boost-select-btn"
                onClick={onClose}
              >
                Done
              </DashboardButton>
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

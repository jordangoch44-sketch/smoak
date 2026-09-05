"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { CloseIcon } from "@/components/ui/icons";
import { DashboardButton } from "@/components/dashboard/shared/DashboardButton";
import { BoostPlacementChoice } from "@/components/dashboard/shared/BoostPlacementChoice";
import { StripeEmbeddedCheckout } from "@/components/dashboard/shared/StripeEmbeddedCheckout";
import { MODAL_OPEN_BODY_CLASS } from "@/lib/blocking-modal";
import {
  BOOST_CAMPAIGN_DAILY_STEP_CENTS,
  BOOST_CAMPAIGN_DEFAULT_DAILY_CENTS,
  BOOST_CAMPAIGN_DEFAULT_DAYS,
  BOOST_CAMPAIGN_MAX_DAILY_CENTS,
  BOOST_CAMPAIGN_MAX_DAYS,
  BOOST_CAMPAIGN_MIN_DAILY_CENTS,
  BOOST_CAMPAIGN_MIN_DAYS,
  boostCampaignSummary,
  getBoostCampaignPlacement,
  isBoostCampaignProduct,
  type BoostCampaignProduct,
} from "@/lib/boost-campaign";
import { createBoostCampaignCheckout } from "@/lib/stripe/boost-campaign-checkout";
import { isProPlusPlan } from "@/lib/stripe/pro-plus-boost";
import type { SmoacAddonProduct } from "@/lib/stripe/products";

interface BoostVisibilityModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional: preselect a placement on the first step */
  initialProduct?: SmoacAddonProduct | null;
}

type CheckoutPayload = {
  clientSecret: string;
  product: BoostCampaignProduct;
  label: string;
  priceLabel: string;
  days: number;
};

type Step = "place" | "budget" | "checkout" | "paid";

export function BoostVisibilityModal({
  open,
  onClose,
  initialProduct = null,
}: BoostVisibilityModalProps) {
  const { session } = useAuthSession();
  const { trainer, formDefaults } = useManagedSpecialistProfile();
  const isProPlus = isProPlusPlan(session?.membershipPlan);
  const [step, setStep] = useState<Step>("place");
  const [product, setProduct] = useState<BoostCampaignProduct | null>(null);
  const [days, setDays] = useState(BOOST_CAMPAIGN_DEFAULT_DAYS);
  const [dailyCents, setDailyCents] = useState(BOOST_CAMPAIGN_DEFAULT_DAILY_CENTS);
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoUrl =
    formDefaults?.profilePhotoUrl?.trim() ||
    trainer?.image?.trim() ||
    trainer?.heroImage?.trim() ||
    session?.avatarUrl?.trim() ||
    "";
  const displayName =
    trainer?.name?.trim() ||
    session?.displayName?.trim() ||
    session?.firstName?.trim() ||
    session?.email?.split("@")[0]?.trim() ||
    "You";

  const summary = useMemo(() => {
    if (!product) return null;
    return boostCampaignSummary({
      product,
      days,
      dailyCents,
      proPlus: isProPlus,
    });
  }, [product, days, dailyCents, isProPlus]);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add(MODAL_OPEN_BODY_CLASS);
    document.documentElement.classList.add(MODAL_OPEN_BODY_CLASS);
    setCheckout(null);
    setError(null);
    setBusy(false);
    setDays(BOOST_CAMPAIGN_DEFAULT_DAYS);
    setDailyCents(BOOST_CAMPAIGN_DEFAULT_DAILY_CENTS);
    setStep("place");
    setProduct(
      isBoostCampaignProduct(initialProduct) ? initialProduct : null
    );

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove(MODAL_OPEN_BODY_CLASS);
      document.documentElement.classList.remove(MODAL_OPEN_BODY_CLASS);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, initialProduct]);

  async function startCheckout() {
    if (!product || !summary) return;
    setBusy(true);
    setError(null);
    setCheckout(null);
    const result = await createBoostCampaignCheckout({
      product,
      days: summary.days,
      dailyCents: summary.dailyCents,
    });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setCheckout({
      clientSecret: result.checkout.clientSecret,
      product: result.checkout.product,
      label: result.checkout.label,
      priceLabel: result.checkout.priceLabel,
      days: result.checkout.days,
    });
    setStep("checkout");
    setBusy(false);
  }

  if (!open || typeof document === "undefined") return null;

  const placement = product ? getBoostCampaignPlacement(product) : null;

  return createPortal(
    <div className="dashboard-modal" role="presentation" onClick={onClose}>
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--boost"
        role="dialog"
        aria-modal="true"
        aria-labelledby="boost-modal-title"
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
          {step === "place" ? (
            <>
              <h2 id="boost-modal-title" className="dashboard-modal__title">
                Where you'll be seen
              </h2>
              <BoostPlacementChoice
                photoUrl={photoUrl}
                name={displayName}
                selected={product}
                onSelect={(key) => {
                  setProduct(key);
                  setError(null);
                }}
              />
              <DashboardButton
                className="dashboard-boost-select-btn"
                onClick={() => setStep("budget")}
                disabled={!product}
              >
                Next
              </DashboardButton>
            </>
          ) : null}

          {step === "budget" && summary && placement ? (
            <>
              <button
                type="button"
                className="dashboard-modal__secondary"
                onClick={() => {
                  setCheckout(null);
                  setError(null);
                  setStep("place");
                }}
              >
                ← {placement.caption}
              </button>
              <h2 id="boost-modal-title" className="dashboard-modal__title">
                Budget
              </h2>

              <dl className="boost-budget__totals">
                <div>
                  <dt>Ad budget</dt>
                  <dd>
                    {summary.dailyLabel} · {summary.durationLabel}
                  </dd>
                </div>
                <div>
                  <dt>Est. views</dt>
                  <dd>{summary.viewsLabel}</dd>
                </div>
                {summary.discountPercent > 0 ? (
                  <div>
                    <dt>Pro Plus</dt>
                    <dd>−{summary.discountPercent}%</dd>
                  </div>
                ) : null}
                <div className="boost-budget__total">
                  <dt>Total</dt>
                  <dd>{summary.payLabel}</dd>
                </div>
              </dl>

              <div className="boost-budget__sliders">
                <label className="boost-budget__slider">
                  <span>
                    Duration
                    <strong>{summary.durationLabel}</strong>
                  </span>
                  <input
                    type="range"
                    min={BOOST_CAMPAIGN_MIN_DAYS}
                    max={BOOST_CAMPAIGN_MAX_DAYS}
                    value={days}
                    onChange={(event) => setDays(Number(event.target.value))}
                  />
                </label>
                <label className="boost-budget__slider">
                  <span>
                    Daily budget
                    <strong>{summary.dailyLabel}</strong>
                  </span>
                  <input
                    type="range"
                    min={BOOST_CAMPAIGN_MIN_DAILY_CENTS}
                    max={BOOST_CAMPAIGN_MAX_DAILY_CENTS}
                    step={BOOST_CAMPAIGN_DAILY_STEP_CENTS}
                    value={dailyCents}
                    onChange={(event) =>
                      setDailyCents(Number(event.target.value))
                    }
                  />
                </label>
              </div>

              <DashboardButton
                className="dashboard-boost-select-btn"
                onClick={() => void startCheckout()}
                disabled={busy}
              >
                {busy ? "Loading…" : `Process · ${summary.payLabel}`}
              </DashboardButton>
            </>
          ) : null}

          {step === "checkout" && checkout ? (
            <>
              <button
                type="button"
                className="dashboard-modal__secondary"
                onClick={() => {
                  setCheckout(null);
                  setError(null);
                  setStep("budget");
                }}
              >
                ← Budget
              </button>
              <h2 id="boost-modal-title" className="dashboard-modal__title">
                Pay {checkout.priceLabel}
              </h2>
              <div className="dashboard-boost-checkout">
                <StripeEmbeddedCheckout
                  clientSecret={checkout.clientSecret}
                  productLabel={checkout.label}
                  priceLabel={checkout.priceLabel}
                  submitLabel={`Pay · ${checkout.priceLabel}`}
                  walletMode="pay"
                  onPaid={() => setStep("paid")}
                  onError={(message) => setError(message || null)}
                />
              </div>
            </>
          ) : null}

          {step === "paid" ? (
            <>
              <h2 id="boost-modal-title" className="dashboard-modal__title">
                You're live
              </h2>
              <p id="boost-modal-desc" className="dashboard-modal__body">
                {checkout?.label ?? placement?.caption} ·{" "}
                {checkout?.days ?? days}{" "}
                {(checkout?.days ?? days) === 1 ? "day" : "days"}
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

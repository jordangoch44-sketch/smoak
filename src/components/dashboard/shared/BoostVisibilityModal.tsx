"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { CloseIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/Logo";
import { DashboardButton } from "@/components/dashboard/shared/DashboardButton";
import { BoostPlacementChoice } from "@/components/dashboard/shared/BoostPlacementChoice";
import { StripeEmbeddedCheckout } from "@/components/dashboard/shared/StripeEmbeddedCheckout";
import { MODAL_OPEN_BODY_CLASS } from "@/lib/blocking-modal";
import {
  BOOST_CAMPAIGN_ALL,
  BOOST_CAMPAIGN_DAILY_STEP_CENTS,
  BOOST_CAMPAIGN_DEFAULT_DAILY_CENTS,
  BOOST_CAMPAIGN_DEFAULT_DAYS,
  BOOST_CAMPAIGN_MAX_DAILY_CENTS,
  BOOST_CAMPAIGN_MAX_DAYS,
  BOOST_CAMPAIGN_MIN_DAILY_CENTS,
  BOOST_CAMPAIGN_MIN_DAYS,
  boostCampaignLabel,
  boostCampaignSummary,
} from "@/lib/boost-campaign";
import { createBoostCampaignCheckout } from "@/lib/stripe/boost-campaign-checkout";
import { isProPlusPlan } from "@/lib/stripe/pro-plus-boost";

interface BoostVisibilityModalProps {
  open: boolean;
  onClose: () => void;
}

type CheckoutPayload = {
  clientSecret: string;
  label: string;
  priceLabel: string;
  days: number;
};

type Step = "place" | "budget" | "checkout" | "paid";

export function BoostVisibilityModal({
  open,
  onClose,
}: BoostVisibilityModalProps) {
  const { session } = useAuthSession();
  const { trainer, formDefaults, application } = useManagedSpecialistProfile();
  const isProPlus = isProPlusPlan(session?.membershipPlan);
  const showPro =
    Boolean(session?.isPremium) ||
    session?.membershipPlan === "premium" ||
    session?.membershipPlan === "platinum";
  const [step, setStep] = useState<Step>("place");
  const [days, setDays] = useState(BOOST_CAMPAIGN_DEFAULT_DAYS);
  const [dailyCents, setDailyCents] = useState(BOOST_CAMPAIGN_DEFAULT_DAILY_CENTS);
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoUrl = firstPhoto(
    formDefaults?.profilePhotoUrl,
    formDefaults?.coverImageUrl,
    application?.media.profilePhotoUrl,
    application?.media.profilePhotoOriginalUrl,
    trainer?.image,
    trainer?.heroImage,
    trainer?.galleryImages?.[0],
    trainer?.gallery?.find((item) => item.type === "image")?.src,
    trainer?.pinnedPhotos?.[0],
    session?.avatarUrl
  );
  const displayName =
    trainer?.name?.trim() ||
    session?.displayName?.trim() ||
    session?.firstName?.trim() ||
    session?.email?.split("@")[0]?.trim() ||
    "You";
  const profession =
    trainer?.profession?.trim() ||
    formDefaults?.profession?.trim() ||
    "Personal Training";

  const summary = useMemo(
    () =>
      boostCampaignSummary({
        product: BOOST_CAMPAIGN_ALL,
        days,
        dailyCents,
        proPlus: isProPlus,
      }),
    [days, dailyCents, isProPlus]
  );

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

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove(MODAL_OPEN_BODY_CLASS);
      document.documentElement.classList.remove(MODAL_OPEN_BODY_CLASS);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    setCheckout(null);
    const result = await createBoostCampaignCheckout({
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
      label: result.checkout.label,
      priceLabel: result.checkout.priceLabel,
      days: result.checkout.days,
    });
    setStep("checkout");
    setBusy(false);
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="dashboard-modal dashboard-modal--boost"
      role="presentation"
      onClick={onClose}
    >
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

        <div className="dashboard-modal__content dashboard-modal__content--boost">
          {step === "place" ? (
            <>
              <div className="boost-modal__chrome">
                <Logo href={null} size="sm" markOnly className="boost-modal__mark" />
                {showPro ? <span className="boost-modal__pro">Pro</span> : null}
              </div>
              <p className="dashboard-modal__eyebrow dashboard-modal__eyebrow--boost">
                Boost your profile
              </p>
              <h2 id="boost-modal-title" className="dashboard-modal__title dashboard-modal__title--boost">
                Where you'll <em>be seen</em>
              </h2>
              <BoostPlacementChoice
                photoUrl={photoUrl}
                name={displayName}
                profession={profession}
              />
              <DashboardButton
                className="dashboard-boost-select-btn"
                onClick={() => setStep("budget")}
              >
                Next
                <span aria-hidden>→</span>
              </DashboardButton>
            </>
          ) : null}

          {step === "budget" ? (
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
                ← Where you'll be seen
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
                {checkout?.label ?? boostCampaignLabel(BOOST_CAMPAIGN_ALL)} ·{" "}
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

function firstPhoto(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

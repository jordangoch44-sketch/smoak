"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { CloseIcon, InfoIcon } from "@/components/ui/icons";
import { getInitials } from "@/lib/utils";
import { BoostPlacementChoice } from "@/components/dashboard/shared/BoostPlacementChoice";
import { StripeEmbeddedCheckout } from "@/components/dashboard/shared/StripeEmbeddedCheckout";
import { MODAL_OPEN_BODY_CLASS } from "@/lib/blocking-modal";
import "@/styles/dashboard.css";
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
import { isLikelyVideoUrl } from "@/lib/media/video-file";

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

const STEPS: readonly Step[] = ["place", "budget", "checkout", "paid"];

const STEP_TITLE: Record<Step, string> = {
  place: "Boost",
  budget: "Budget & duration",
  checkout: "Checkout",
  paid: "Boost",
};

export function BoostVisibilityModal({
  open,
  onClose,
}: BoostVisibilityModalProps) {
  const { session } = useAuthSession();
  const { trainer, formDefaults, application } = useManagedSpecialistProfile();
  const isProPlus = isProPlusPlan(session?.membershipPlan);
  const [step, setStep] = useState<Step>("place");
  const [days, setDays] = useState(BOOST_CAMPAIGN_DEFAULT_DAYS);
  const [dailyCents, setDailyCents] = useState(BOOST_CAMPAIGN_DEFAULT_DAILY_CENTS);
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showViewsHint, setShowViewsHint] = useState(false);
  const [payingWithCard, setPayingWithCard] = useState(false);

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

  const dailyPct = sliderPercent(
    dailyCents,
    BOOST_CAMPAIGN_MIN_DAILY_CENTS,
    BOOST_CAMPAIGN_MAX_DAILY_CENTS
  );
  const daysPct = sliderPercent(
    days,
    BOOST_CAMPAIGN_MIN_DAYS,
    BOOST_CAMPAIGN_MAX_DAYS
  );
  const stepIndex = STEPS.indexOf(step);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add(MODAL_OPEN_BODY_CLASS);
    document.documentElement.classList.add(MODAL_OPEN_BODY_CLASS);
    setCheckout(null);
    setError(null);
    setBusy(false);
    setShowViewsHint(false);
    setPayingWithCard(false);
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

  function goBack() {
    setError(null);
    if (step === "budget") {
      setCheckout(null);
      setStep("place");
      return;
    }
    if (step === "checkout") {
      setCheckout(null);
      setPayingWithCard(false);
      setStep("budget");
    }
  }

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

  const canGoBack = step === "budget" || step === "checkout";

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
        <header className="boost-ig-top">
          {canGoBack ? (
            <button
              type="button"
              className="boost-ig-icon-btn"
              onClick={goBack}
              aria-label="Back"
            >
              <BackChevron />
            </button>
          ) : (
            <span className="boost-ig-icon-btn boost-ig-icon-btn--ghost" />
          )}
          <h2 id="boost-modal-title" className="boost-ig-top__title">
            {STEP_TITLE[step]}
          </h2>
          <button
            type="button"
            className="boost-ig-icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="boost-ig-progress" aria-hidden>
          {STEPS.map((id, index) => (
            <span
              key={id}
              className={index <= stepIndex ? "boost-ig-progress__seg is-on" : "boost-ig-progress__seg"}
            />
          ))}
        </div>

        <div
          className={[
            "dashboard-modal__content dashboard-modal__content--boost",
            step === "checkout" ? "dashboard-modal__content--boost-pay" : "",
            step === "paid" ? "dashboard-modal__content--boost-live" : "",
            payingWithCard ? "is-card-open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {step === "place" ? (
            <>
              <div className="boost-ig-hero">
                <h3 className="boost-ig-hero__title">Where you'll be seen</h3>
                <p className="boost-ig-hero__sub">
                  One boost places you in Marketplace, Search, and Homepage.
                </p>
              </div>
              <BoostPlacementChoice
                photoUrl={photoUrl}
                name={displayName}
                profession={profession}
              />
              <button
                type="button"
                className="boost-ig-next"
                onClick={() => setStep("budget")}
              >
                Next
              </button>
            </>
          ) : null}

          {step === "budget" ? (
            <>
              <div className="boost-ig-hero">
                <h3 className="boost-ig-hero__title">What's your ad budget?</h3>
                <p className="boost-ig-hero__sub">
                  Excludes processing fees and applicable taxes.
                </p>
              </div>

              <label className="boost-ig-field">
                <span className="boost-ig-field__row">
                  <span>Daily budget</span>
                  <span className="boost-ig-field__value">
                    <span className="boost-ig-field__prefix">$</span>
                    <span className="boost-ig-field__box">{summary.dailyDollars}</span>
                  </span>
                </span>
                <input
                  className="boost-ig-slider"
                  type="range"
                  min={BOOST_CAMPAIGN_MIN_DAILY_CENTS}
                  max={BOOST_CAMPAIGN_MAX_DAILY_CENTS}
                  step={BOOST_CAMPAIGN_DAILY_STEP_CENTS}
                  value={dailyCents}
                  style={{ "--pct": `${dailyPct}%` } as CSSProperties}
                  onChange={(event) =>
                    setDailyCents(Number(event.target.value))
                  }
                  aria-label="Daily budget"
                />
              </label>

              <label className="boost-ig-field">
                <span className="boost-ig-field__row">
                  <span>Duration</span>
                  <span className="boost-ig-field__value">
                    <span className="boost-ig-field__box">{summary.days}</span>
                  </span>
                </span>
                <input
                  className="boost-ig-slider"
                  type="range"
                  min={BOOST_CAMPAIGN_MIN_DAYS}
                  max={BOOST_CAMPAIGN_MAX_DAYS}
                  value={days}
                  style={{ "--pct": `${daysPct}%` } as CSSProperties}
                  onChange={(event) => setDays(Number(event.target.value))}
                  aria-label="Duration in days"
                />
              </label>

              <dl className="boost-ig-summary">
                <div>
                  <dt>Ad budget</dt>
                  <dd>
                    {summary.payLabel} over {summary.durationLabel}
                  </dd>
                </div>
                <div>
                  <dt>
                    Estimated views
                    <button
                      type="button"
                      className="boost-ig-info"
                      aria-label="About estimated views"
                      onClick={() => setShowViewsHint((openHint) => !openHint)}
                    >
                      <InfoIcon className="h-3.5 w-3.5" />
                    </button>
                  </dt>
                  <dd>{summary.viewsRangeLabel}</dd>
                </div>
                {summary.discountPercent > 0 ? (
                  <div>
                    <dt>PRO+</dt>
                    <dd>−{summary.discountPercent}%</dd>
                  </div>
                ) : null}
              </dl>
              {showViewsHint ? (
                <p className="boost-ig-hint">
                  A projected range of profile views over this campaign. Actual
                  results vary with demand in your area.
                </p>
              ) : null}

              <button
                type="button"
                className="boost-ig-next"
                onClick={() => void startCheckout()}
                disabled={busy}
              >
                {busy ? "Loading…" : "Next"}
              </button>
            </>
          ) : null}

          {step === "checkout" && checkout ? (
            <>
              <div className="boost-ig-hero boost-ig-hero--compact">
                <h3 className="boost-ig-hero__title">Pay {checkout.priceLabel}</h3>
                <p className="boost-ig-hero__sub">
                  {checkout.label} · {checkout.days}{" "}
                  {checkout.days === 1 ? "day" : "days"}
                </p>
              </div>
              <div className="boost-checkout-spotlight">
                <BoostCheckoutCharge
                  photoUrl={photoUrl}
                  displayName={displayName}
                />
                <p className="boost-checkout-spotlight__word">Boost</p>
                <dl className="boost-checkout-spotlight__stats">
                  <div>
                    <dt>Estimated views</dt>
                    <dd>{summary.viewsRangeLabel}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{summary.durationLabel}</dd>
                  </div>
                  <div>
                    <dt>You'll appear in</dt>
                    <dd>Marketplace, Search, Homepage</dd>
                  </div>
                </dl>
              </div>
              <div className="dashboard-boost-checkout">
                <StripeEmbeddedCheckout
                  clientSecret={checkout.clientSecret}
                  productLabel={checkout.label}
                  priceLabel={checkout.priceLabel}
                  submitLabel={`Pay · ${checkout.priceLabel}`}
                  walletMode="pay"
                  foldCard
                  onFoldChange={setPayingWithCard}
                  onPaid={() => setStep("paid")}
                  onError={(message) => setError(message || null)}
                />
              </div>
            </>
          ) : null}

          {step === "paid" ? (
            <>
              <div className="boost-checkout-spotlight boost-checkout-spotlight--live">
                <BoostCheckoutCharge
                  photoUrl={photoUrl}
                  displayName={displayName}
                  live
                />
                <p className="boost-checkout-spotlight__word">Boost</p>
              </div>
              <div className="boost-ig-hero boost-ig-hero--center">
                <h3 className="boost-ig-hero__title">You're live</h3>
                <p className="boost-ig-hero__sub">
                  {checkout?.label ?? boostCampaignLabel(BOOST_CAMPAIGN_ALL)} ·{" "}
                  {checkout?.days ?? days}{" "}
                  {(checkout?.days ?? days) === 1 ? "day" : "days"}
                </p>
              </div>
              <button type="button" className="boost-ig-next" onClick={onClose}>
                Done
              </button>
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

function BoostCheckoutCharge({
  photoUrl,
  displayName,
  live = false,
}: {
  photoUrl: string;
  displayName: string;
  live?: boolean;
}) {
  return (
    <div
      className={
        live ? "boost-checkout-charge boost-checkout-charge--live" : "boost-checkout-charge"
      }
    >
      <span className="boost-checkout-charge__halo" aria-hidden />
      <span className="boost-checkout-charge__pulse" aria-hidden />
      <span className="boost-checkout-charge__pulse boost-checkout-charge__pulse--lag" aria-hidden />
      <svg
        className="boost-checkout-charge__bolts"
        viewBox="0 0 200 200"
        aria-hidden
      >
        <defs>
          <linearGradient id="boost-charge-bolt" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#fffce8" />
            <stop offset="40%" stopColor="#fae642" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <mask id="boost-charge-bolt-mask">
            <rect width="200" height="200" fill="#fff" />
            <circle cx="100" cy="100" r="49" fill="#000" />
          </mask>
        </defs>
        <g mask="url(#boost-charge-bolt-mask)">
        <g transform="translate(100 100) rotate(-128) translate(0 -92) scale(1.7)">
          <g className="boost-checkout-charge__bolt-g boost-checkout-charge__bolt-g--1">
            <path
              fill="url(#boost-charge-bolt)"
              d="M12 0 3 26h10L0 56l22-30H11z"
            />
          </g>
        </g>
        <g transform="translate(100 100) rotate(-42) translate(0 -92) scale(1.7)">
          <g className="boost-checkout-charge__bolt-g boost-checkout-charge__bolt-g--2">
            <path
              fill="url(#boost-charge-bolt)"
              d="M12 0 3 26h10L0 56l22-30H11z"
            />
          </g>
        </g>
        <g transform="translate(100 100) rotate(38) translate(0 -90) scale(1.7)">
          <g className="boost-checkout-charge__bolt-g boost-checkout-charge__bolt-g--3">
            <path
              fill="url(#boost-charge-bolt)"
              d="M12 0 3 26h10L0 56l22-30H11z"
            />
          </g>
        </g>
        <g transform="translate(100 100) rotate(132) translate(0 -92) scale(1.7)">
          <g className="boost-checkout-charge__bolt-g boost-checkout-charge__bolt-g--4">
            <path
              fill="url(#boost-charge-bolt)"
              d="M12 0 3 26h10L0 56l22-30H11z"
            />
          </g>
        </g>
        <g transform="translate(100 100) rotate(188) translate(0 -88) scale(1.45)">
          <g className="boost-checkout-charge__bolt-g boost-checkout-charge__bolt-g--5">
            <path
              fill="url(#boost-charge-bolt)"
              d="M10 0 2 22h8L0 48l18-26H9z"
            />
          </g>
        </g>
        </g>
      </svg>
      <span
        className={
          photoUrl
            ? "boost-checkout-charge__core"
            : "boost-checkout-charge__core boost-checkout-charge__core--fallback"
        }
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" />
        ) : (
          getInitials(displayName)
        )}
        <span className="boost-checkout-charge__energy" aria-hidden />
      </span>
    </div>
  );
}

function sliderPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function BackChevron() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5 8.25 12l7.5-7.5"
      />
    </svg>
  );
}

function firstPhoto(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed && !isLikelyVideoUrl(trimmed)) return trimmed;
  }
  return "";
}

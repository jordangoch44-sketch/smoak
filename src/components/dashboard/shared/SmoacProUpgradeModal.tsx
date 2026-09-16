"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  CalendarIcon,
  CameraIcon,
  ChartIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  CrownIcon,
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
  SMOAC_UPGRADE_FOOTER,
  type MembershipBenefit,
  type MembershipUpgradeOffer,
} from "@/lib/specialist-premium";
import { postManageBilling } from "@/lib/stripe/manage-billing-client";
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
  "Up to 5 phone videos, 45 seconds each": CameraIcon,
  "Client results under Specialties": PhotosStackIcon,
  "20% off Boost campaigns": PercentIcon,
};

const TITLE_ACCENTS = ["keep Pro", "Keep Pro", "PRO+", "Pro"] as const;

export function UpgradeMark() {
  return (
    <span className="dashboard-upgrade__mark" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- official plate crop, paints with the modal */}
      <img
        src={LOGO_ICON_SRC}
        alt=""
        width={64}
        height={64}
        decoding="sync"
        fetchPriority="high"
        className="dashboard-upgrade__s"
      />
    </span>
  );
}

export function UpgradeTitleText({ title }: { title: string }) {
  const accent = TITLE_ACCENTS.find((phrase) => title.includes(phrase));
  if (!accent) return title;
  const index = title.lastIndexOf(accent);
  return (
    <>
      {title.slice(0, index)}
      <span className="dashboard-upgrade__title-accent">{accent}</span>
      {title.slice(index + accent.length)}
    </>
  );
}

export function UpgradePerkList({
  benefits,
}: {
  benefits: readonly MembershipBenefit[];
}) {
  return (
    <ul className="dashboard-upgrade__perks">
      {benefits.map((benefit) => {
        const PerkIcon = PERK_ICONS[benefit.title] ?? CheckIcon;
        return (
          <li key={benefit.title}>
            <span className="dashboard-upgrade__perk-icon-wrap" aria-hidden>
              <PerkIcon className="dashboard-upgrade__perk-icon" />
            </span>
            <span className="dashboard-upgrade__perk-copy">
              <span className="dashboard-upgrade__perk-title">{benefit.title}</span>
              <span className="dashboard-upgrade__perk-detail">{benefit.detail}</span>
            </span>
            <ChevronRightIcon className="dashboard-upgrade__perk-chevron" />
          </li>
        );
      })}
    </ul>
  );
}

export function UpgradeCta({
  children,
  busy,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  busy?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <DashboardButton
      className={cn("dashboard-pro-upgrade-btn dashboard-upgrade__cta", className)}
      onClick={onClick}
      disabled={disabled || busy}
    >
      <span className="dashboard-upgrade__cta-label">{children}</span>
      <span className="dashboard-upgrade__cta-go" aria-hidden>
        <ChevronRightIcon className="dashboard-upgrade__cta-arrow" />
      </span>
    </DashboardButton>
  );
}

export function UpgradeFooter() {
  return <p className="dashboard-upgrade__footer">{SMOAC_UPGRADE_FOOTER}</p>;
}

function PlanChip({
  label,
  caption,
}: {
  label: string;
  caption: string;
}) {
  return (
    <div className="dashboard-upgrade__plan-chip">
      <CrownIcon className="dashboard-upgrade__plan-chip-crown" />
      <span className="dashboard-upgrade__plan-chip-label">{label}</span>
      <span className="dashboard-upgrade__plan-chip-caption">{caption}</span>
    </div>
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
          <UpgradeTitleText title={offer.title} />
        </h2>
        <p id="smoac-pro-modal-desc" className="dashboard-upgrade__body">
          {offer.description}
        </p>
      </div>

      <div className="dashboard-upgrade__price-card">
        <div className="dashboard-upgrade__price-copy">
          <p className="dashboard-upgrade__price">
            <span className="dashboard-upgrade__amount">{price.amount}</span>
            {price.cadence ? (
              <span className="dashboard-upgrade__cadence">{price.cadence}</span>
            ) : null}
          </p>
          <p className="dashboard-upgrade__billing">{offer.note}</p>
        </div>
        <PlanChip label={offer.badgeLabel} caption={offer.badgeCaption} />
      </div>

      <UpgradePerkList benefits={offer.benefits} />

      {error ? (
        <p className="dashboard-modal__error" role="alert">
          {error}
        </p>
      ) : null}

      <UpgradeCta busy={busy} onClick={onCheckout}>
        {busy ? "Loading…" : offer.cta}
      </UpgradeCta>
      {offer.secondaryCta ? (
        <FastActivateButton
          className="dashboard-modal__secondary"
          onActivate={onClose}
        >
          {offer.secondaryCta}
        </FastActivateButton>
      ) : null}
      <UpgradeFooter />
    </div>
  );
}

export function SmoacProUpgradeModal({
  open,
  onClose,
  trialEnded = false,
}: SmoacProUpgradeModalProps) {
  const router = useRouter();
  const { session, refreshSession } = useAuthSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [payingWithCard, setPayingWithCard] = useState(false);
  const offer = resolveMembershipUpgradeOffer(session, { trialEnded });
  const offersBoost = offer.intent === "boost";

  useEffect(() => {
    if (!open || offersBoost) return;

    document.body.classList.add(MODAL_OPEN_BODY_CLASS);
    document.documentElement.classList.add(MODAL_OPEN_BODY_CLASS);
    setError(null);
    setBusy(false);
    setCheckout(null);
    setPayingWithCard(false);
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
    setPayingWithCard(false);
    setStep("pick");
  }

  async function afterPaid() {
    await postManageBilling({ action: "sync" });
    await refreshSession();
    router.refresh();
    setStep("paid");
  }

  const dialogClass = cn(
    "dashboard-modal__dialog dashboard-modal__dialog--pro dashboard-modal__dialog--upgrade",
    `dashboard-modal__dialog--upgrade-${offer.tone}`,
    step === "checkout" && "dashboard-modal__dialog--upgrade-pay"
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

        <div
          className={cn(
            "dashboard-modal__content dashboard-upgrade-content",
            step === "checkout" && "dashboard-modal__content--upgrade-pay",
            payingWithCard && "is-card-open"
          )}
        >
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
            <div className="dashboard-upgrade dashboard-upgrade--pay">
              <FastActivateButton
                className="dashboard-modal__secondary dashboard-upgrade__back"
                onActivate={backToPick}
              >
                ← Back
              </FastActivateButton>
              <div className="dashboard-upgrade__hero dashboard-upgrade__hero--pay">
                <p className="dashboard-modal__eyebrow dashboard-upgrade__eyebrow">
                  {offer.eyebrow}
                </p>
                <h2
                  id="smoac-pro-modal-title"
                  className="dashboard-upgrade__title"
                >
                  Subscribe to {checkout.label}
                </h2>
                <p id="smoac-pro-modal-desc" className="dashboard-upgrade__body">
                  Apple Pay, Google Pay, or card. Billed monthly. Cancel
                  anytime.
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
              </div>
              {error ? (
                <p className="dashboard-modal__error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="dashboard-upgrade__pay">
                <StripeEmbeddedCheckout
                  clientSecret={checkout.clientSecret}
                  productLabel={checkout.label}
                  priceLabel={checkout.priceLabel}
                  submitLabel={`Subscribe · ${checkout.priceLabel}`}
                  walletMode="subscribe"
                  foldCard
                  onFoldChange={setPayingWithCard}
                  onPaid={() => void afterPaid()}
                  onError={(message) => setError(message || null)}
                />
              </div>
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
                Your plan is live. Manage billing anytime in Subscription /
                account settings.
              </p>
              <UpgradeCta onClick={onClose}>Done</UpgradeCta>
              <UpgradeFooter />
            </div>
          ) : null}
        </div>
      </div>
    </DashboardModalScrim>,
    document.body
  );
}

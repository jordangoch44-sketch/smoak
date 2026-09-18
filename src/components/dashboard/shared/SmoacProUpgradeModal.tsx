"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CloseIcon } from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/useAuthSession";
import { MODAL_OPEN_BODY_CLASS } from "@/lib/blocking-modal";
import {
  isMembershipUpgradeOffer,
  resolveMembershipUpgradeOffer,
} from "@/lib/specialist-premium";
import { postManageBilling } from "@/lib/stripe/manage-billing-client";
import { createEmbeddedSubscriptionCheckout } from "@/lib/stripe/subscription-checkout";
import type { SmoacMembershipProduct } from "@/lib/stripe/products";
import { cn } from "@/lib/utils";
import { BoostVisibilityModal } from "./BoostVisibilityModal";
import {
  MembershipUnlockPitch,
  membershipUnlockKindFromOffer,
  UpgradeCta,
  UpgradeFooter,
  UpgradeMark,
} from "./MembershipUnlockPitch";
import {
  DASHBOARD_MODAL_DIALOG_POINTER_PROPS,
  DashboardModalCloseButton,
  DashboardModalScrim,
} from "./DashboardModalScrim";
import { StripeEmbeddedCheckout } from "./StripeEmbeddedCheckout";

export {
  UpgradeCta,
  UpgradeFooter,
  UpgradeMark,
  UpgradePerkList,
  UpgradeTitleText,
} from "./MembershipUnlockPitch";

interface SmoacProUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Force the trial-ended Pro continue prompt. */
  trialEnded?: boolean;
  /** The caller already showed the pitch — go straight to Stripe. */
  skipPick?: boolean;
}

type CheckoutPayload = {
  clientSecret: string;
  product: SmoacMembershipProduct;
  label: string;
  priceLabel: string;
};

type Step = "pick" | "checkout" | "paid";

function CheckoutBackIcon() {
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

function MembershipCheckoutPage({
  priceLabel,
  productLabel,
  checkout,
  busy,
  error,
  payingWithCard,
  onBack,
  onClose,
  onPaid,
  onError,
  onRetry,
  onFoldChange,
}: {
  priceLabel: string;
  productLabel: string;
  checkout: CheckoutPayload | null;
  busy: boolean;
  error: string | null;
  payingWithCard: boolean;
  onBack: () => void;
  onClose: () => void;
  onPaid: () => void;
  onError: (message: string) => void;
  onRetry: () => void;
  onFoldChange: (open: boolean) => void;
}) {
  return (
    <>
      <header className="boost-ig-top">
        <FastActivateButton
          className="boost-ig-icon-btn"
          onActivate={onBack}
          aria-label="Back"
        >
          <CheckoutBackIcon />
        </FastActivateButton>
        <h2 id="smoac-pro-modal-title" className="boost-ig-top__title">
          Checkout
        </h2>
        <FastActivateButton
          className="boost-ig-icon-btn"
          onActivate={onClose}
          aria-label="Close"
        >
          <CloseIcon className="h-5 w-5" />
        </FastActivateButton>
      </header>
      <div
        className={cn(
          "dashboard-modal__content dashboard-modal__content--boost dashboard-modal__content--boost-pay",
          payingWithCard && "is-card-open"
        )}
      >
        <div className="boost-ig-hero boost-ig-hero--compact">
          <h3 className="boost-ig-hero__title">Pay {priceLabel}</h3>
          <p id="smoac-pro-modal-desc" className="boost-ig-hero__sub">
            {productLabel} · billed monthly. Cancel anytime.
          </p>
        </div>
        {error ? (
          <p className="dashboard-modal__error" role="alert">
            {error}
          </p>
        ) : null}
        {checkout ? (
          <div className="dashboard-boost-checkout">
            <StripeEmbeddedCheckout
              clientSecret={checkout.clientSecret}
              productLabel={checkout.label}
              priceLabel={checkout.priceLabel}
              submitLabel={`Subscribe · ${checkout.priceLabel}`}
              walletMode="subscribe"
              foldCard
              onFoldChange={onFoldChange}
              onPaid={onPaid}
              onError={onError}
            />
          </div>
        ) : error ? (
          <FastActivateButton
            className="boost-ig-next"
            onActivate={onRetry}
            disabled={busy}
          >
            Try again
          </FastActivateButton>
        ) : null}
      </div>
    </>
  );
}

export function SmoacProUpgradeModal({
  open,
  onClose,
  trialEnded = false,
  skipPick = false,
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
  const checkoutProduct = isMembershipUpgradeOffer(offer)
    ? offer.product
    : null;

  useEffect(() => {
    if (!open || offersBoost) return;

    document.body.classList.add(MODAL_OPEN_BODY_CLASS);
    document.documentElement.classList.add(MODAL_OPEN_BODY_CLASS);
    setError(null);
    setBusy(skipPick);
    setCheckout(null);
    setPayingWithCard(false);
    setStep(skipPick ? "checkout" : "pick");

    let cancelled = false;

    async function beginCheckout() {
      if (!skipPick || !checkoutProduct) return;
      setBusy(true);
      setError(null);
      const result = await createEmbeddedSubscriptionCheckout(checkoutProduct);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      setCheckout({
        clientSecret: result.checkout.clientSecret,
        product: checkoutProduct,
        label: result.checkout.label,
        priceLabel: result.checkout.priceLabel,
      });
      setStep("checkout");
      setBusy(false);
    }

    void beginCheckout();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelled = true;
      document.body.classList.remove(MODAL_OPEN_BODY_CLASS);
      document.documentElement.classList.remove(MODAL_OPEN_BODY_CLASS);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, offersBoost, skipPick, checkoutProduct]);

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
    if (skipPick) {
      onClose();
      return;
    }
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

  const showCheckoutPage =
    (skipPick && step !== "paid") || step === "checkout";
  const payLabel = checkout?.priceLabel ?? offer.price;
  const productLabel = checkout?.label ?? "SMOAC Pro";

  if (showCheckoutPage) {
    return createPortal(
      <DashboardModalScrim
        className="dashboard-modal--boost"
        onDismiss={onClose}
      >
        <div
          className="dashboard-modal__dialog dashboard-modal__dialog--boost"
          role="dialog"
          aria-modal="true"
          aria-labelledby="smoac-pro-modal-title"
          aria-describedby="smoac-pro-modal-desc"
          {...DASHBOARD_MODAL_DIALOG_POINTER_PROPS}
        >
          <MembershipCheckoutPage
            priceLabel={payLabel}
            productLabel={productLabel}
            checkout={checkout}
            busy={busy}
            error={error}
            payingWithCard={payingWithCard}
            onBack={backToPick}
            onClose={onClose}
            onPaid={() => void afterPaid()}
            onError={(message) => setError(message || null)}
            onRetry={() => void startCheckout()}
            onFoldChange={setPayingWithCard}
          />
        </div>
      </DashboardModalScrim>,
      document.body
    );
  }

  return createPortal(
    <DashboardModalScrim
      className={`dashboard-modal--upgrade dashboard-modal--upgrade-${offer.tone}`}
      onDismiss={onClose}
    >
      <div
        className={cn(
          "dashboard-modal__dialog specialist-overview-gate__card smoac-unlock-pitch",
          `dashboard-modal__dialog--upgrade-${offer.tone}`
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-unlock-title"
        aria-describedby="membership-unlock-desc"
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

        {step === "pick" ? (
          <MembershipUnlockPitch
            kind={membershipUnlockKindFromOffer(offer, trialEnded)}
            offer={offer}
            busy={busy}
            error={error}
            onUnlock={() => void startCheckout()}
          />
        ) : null}

        {step === "paid" ? (
          <div className="dashboard-upgrade specialist-overview-gate__upgrade">
            <UpgradeMark />
            <p className="dashboard-modal__eyebrow dashboard-upgrade__eyebrow">
              {offer.eyebrow}
            </p>
            <h2 id="membership-unlock-title" className="dashboard-upgrade__title">
              {checkout?.label ?? "Pro"} is active
            </h2>
            <p id="membership-unlock-desc" className="dashboard-upgrade__body">
              Your plan is live. Manage billing anytime in Subscription /
              account settings.
            </p>
            <UpgradeCta onClick={onClose}>Done</UpgradeCta>
            <UpgradeFooter />
          </div>
        ) : null}
      </div>
    </DashboardModalScrim>,
    document.body
  );
}

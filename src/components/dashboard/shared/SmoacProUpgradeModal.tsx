"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CloseIcon } from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useManagedSpecialistProfile } from "@/hooks/useManagedSpecialistProfile";
import { MODAL_OPEN_BODY_CLASS } from "@/lib/blocking-modal";
import { isLikelyVideoUrl } from "@/lib/media/video-file";
import {
  isMembershipUpgradeOffer,
  membershipUpgradeOfferForProduct,
  resolveMembershipUpgradeOffer,
  type MembershipBenefit,
} from "@/lib/specialist-premium";
import { postManageBilling } from "@/lib/stripe/manage-billing-client";
import { createEmbeddedSubscriptionCheckout } from "@/lib/stripe/subscription-checkout";
import type { SmoacMembershipProduct } from "@/lib/stripe/products";
import { cn, getInitials } from "@/lib/utils";
import { BoostVisibilityModal } from "./BoostVisibilityModal";
import {
  MembershipUnlockPitch,
  membershipUnlockKindFromOffer,
  UnlockCheckoutSpiral,
  UNLOCK_COLLAPSE_MS,
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
  /** Checkout this membership instead of the next-step offer. */
  product?: SmoacMembershipProduct;
}

type CheckoutPayload = {
  clientSecret: string;
  product: SmoacMembershipProduct;
  label: string;
  priceLabel: string;
};

type Step = "pick" | "checkout" | "paid";

async function waitAtLeast(startedAt: number, minMs: number) {
  const remaining = minMs - (Date.now() - startedAt);
  if (remaining <= 0) return;
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, remaining);
  });
}

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

function firstPhoto(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed && !isLikelyVideoUrl(trimmed)) return trimmed;
  }
  return "";
}

function ProCheckoutCharge({
  photoUrl,
  displayName,
  live = false,
}: {
  photoUrl: string;
  displayName: string;
  live?: boolean;
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `pro-charge-bolt-${rawId}`;
  const maskId = `pro-charge-mask-${rawId}`;

  return (
    <div
      className={cn(
        "boost-checkout-charge boost-checkout-charge--pro",
        live && "boost-checkout-charge--live"
      )}
    >
      <span className="boost-checkout-charge__halo" aria-hidden />
      <span className="boost-checkout-charge__pulse" aria-hidden />
      <span
        className="boost-checkout-charge__pulse boost-checkout-charge__pulse--lag"
        aria-hidden
      />
      <svg
        className="boost-checkout-charge__bolts"
        viewBox="0 0 200 200"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="38%" stopColor="#ddd6fe" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <mask id={maskId}>
            <rect width="200" height="200" fill="#fff" />
            <circle cx="100" cy="100" r="49" fill="#000" />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          <g transform="translate(100 100) rotate(-128) translate(0 -92) scale(1.7)">
            <g className="boost-checkout-charge__bolt-g boost-checkout-charge__bolt-g--1">
              <path fill={`url(#${gradId})`} d="M12 0 3 26h10L0 56l22-30H11z" />
            </g>
          </g>
          <g transform="translate(100 100) rotate(-42) translate(0 -92) scale(1.7)">
            <g className="boost-checkout-charge__bolt-g boost-checkout-charge__bolt-g--2">
              <path fill={`url(#${gradId})`} d="M12 0 3 26h10L0 56l22-30H11z" />
            </g>
          </g>
          <g transform="translate(100 100) rotate(38) translate(0 -90) scale(1.7)">
            <g className="boost-checkout-charge__bolt-g boost-checkout-charge__bolt-g--3">
              <path fill={`url(#${gradId})`} d="M12 0 3 26h10L0 56l22-30H11z" />
            </g>
          </g>
          <g transform="translate(100 100) rotate(132) translate(0 -92) scale(1.7)">
            <g className="boost-checkout-charge__bolt-g boost-checkout-charge__bolt-g--4">
              <path fill={`url(#${gradId})`} d="M12 0 3 26h10L0 56l22-30H11z" />
            </g>
          </g>
          <g transform="translate(100 100) rotate(188) translate(0 -88) scale(1.45)">
            <g className="boost-checkout-charge__bolt-g boost-checkout-charge__bolt-g--5">
              <path fill={`url(#${gradId})`} d="M10 0 2 22h8L0 48l18-26H9z" />
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
          // eslint-disable-next-line @next/next/no-img-element -- specialist portrait, not a layout image
          <img src={photoUrl} alt="" />
        ) : (
          getInitials(displayName)
        )}
        <span className="boost-checkout-charge__energy" aria-hidden />
      </span>
    </div>
  );
}
function MembershipCheckoutPage({
  priceLabel,
  productLabel,
  productWord,
  benefits,
  photoUrl,
  displayName,
  checkout,
  busy,
  error,
  paid,
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
  productWord: string;
  benefits: readonly MembershipBenefit[];
  photoUrl: string;
  displayName: string;
  checkout: CheckoutPayload | null;
  busy: boolean;
  error: string | null;
  paid: boolean;
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
          onActivate={paid ? onClose : onBack}
          aria-label={paid ? "Close" : "Back"}
        >
          <CheckoutBackIcon />
        </FastActivateButton>
        <h2 id="smoac-pro-modal-title" className="boost-ig-top__title">
          {paid ? productWord : "Checkout"}
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
          paid && "dashboard-modal__content--boost-live",
          payingWithCard && "is-card-open"
        )}
      >
        {paid ? (
          <>
            <div className="boost-checkout-spotlight boost-checkout-spotlight--live">
              <ProCheckoutCharge
                photoUrl={photoUrl}
                displayName={displayName}
                live
              />
              <p className="boost-checkout-spotlight__word pro-checkout-spotlight__word">
                {productWord}
              </p>
            </div>
            <div className="boost-ig-hero boost-ig-hero--center">
              <h3 className="boost-ig-hero__title">{productWord} is active</h3>
              <p id="smoac-pro-modal-desc" className="boost-ig-hero__sub">
                Your plan is live. Manage billing anytime in Subscription /
                account settings.
              </p>
            </div>
            <FastActivateButton className="boost-ig-next" onActivate={onClose}>
              Done
            </FastActivateButton>
          </>
        ) : (
          <>
            <div className="boost-ig-hero boost-ig-hero--compact">
              <h3 className="boost-ig-hero__title">Pay {priceLabel}</h3>
              <p id="smoac-pro-modal-desc" className="boost-ig-hero__sub">
                {productLabel} · billed monthly. Cancel anytime.
              </p>
            </div>
            <div className="boost-checkout-spotlight">
              <ProCheckoutCharge
                photoUrl={photoUrl}
                displayName={displayName}
              />
              <p className="boost-checkout-spotlight__word pro-checkout-spotlight__word">
                {productWord}
              </p>
              <ul className="pro-checkout-benefits">
                {benefits.map((benefit) => (
                  <li key={benefit.title}>
                    <span className="pro-checkout-benefits__copy">
                      <span className="pro-checkout-benefits__title">
                        {benefit.title}
                      </span>
                      <span className="pro-checkout-benefits__detail">
                        {benefit.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
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
          </>
        )}
      </div>
    </>
  );
}

export function SmoacProUpgradeModal({
  open,
  onClose,
  trialEnded = false,
  skipPick = false,
  product,
}: SmoacProUpgradeModalProps) {
  const router = useRouter();
  const { session, refreshSession } = useAuthSession();
  const { trainer, formDefaults, application } = useManagedSpecialistProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [payingWithCard, setPayingWithCard] = useState(false);
  const growthOffer = resolveMembershipUpgradeOffer(session, { trialEnded });
  const offer = product
    ? membershipUpgradeOfferForProduct(product, session, { trialEnded })
    : growthOffer;
  const offersBoost = !isMembershipUpgradeOffer(offer);
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
      const startedAt = Date.now();
      const result = await createEmbeddedSubscriptionCheckout(checkoutProduct);
      if (cancelled) return;
      await waitAtLeast(startedAt, 420);
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
  }, [open, onClose, offersBoost, skipPick, checkoutProduct, product]);

  if (!open || typeof document === "undefined") return null;

  if (!isMembershipUpgradeOffer(offer)) {
    return <BoostVisibilityModal open={open} onClose={onClose} />;
  }

  async function startCheckout() {
    if (!isMembershipUpgradeOffer(offer)) return;
    setBusy(true);
    setError(null);
    const startedAt = Date.now();
    const result = await createEmbeddedSubscriptionCheckout(offer.product);
    await waitAtLeast(startedAt, UNLOCK_COLLAPSE_MS);
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

  const showUnlockOrb =
    skipPick && step !== "paid" && !checkout && !error;
  const showCheckoutPage =
    !showUnlockOrb &&
    (step === "checkout" ||
      step === "paid" ||
      (skipPick && Boolean(checkout || error)));
  const payLabel = checkout?.priceLabel ?? offer.price;
  const productLabel = checkout?.label ?? "SMOAC Pro";
  const productWord = offer.intent === "pro-plus" ? "PRO+" : "Pro";
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

  if (showUnlockOrb) {
    return createPortal(
      <DashboardModalScrim
        className="dashboard-modal--upgrade dashboard-modal--upgrade-orb"
        onDismiss={onClose}
      >
        <div
          className="smoac-unlock-pitch smoac-unlock-pitch--orb"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Opening checkout"
          {...DASHBOARD_MODAL_DIALOG_POINTER_PROPS}
        >
          <UnlockCheckoutSpiral />
        </div>
      </DashboardModalScrim>,
      document.body
    );
  }

  if (showCheckoutPage) {
    return createPortal(
      <DashboardModalScrim
        className="dashboard-modal--boost"
        onDismiss={onClose}
      >
        <div
          className="dashboard-modal__dialog dashboard-modal__dialog--boost dashboard-modal__dialog--from-unlock"
          role="dialog"
          aria-modal="true"
          aria-labelledby="smoac-pro-modal-title"
          aria-describedby="smoac-pro-modal-desc"
          {...DASHBOARD_MODAL_DIALOG_POINTER_PROPS}
        >
          <MembershipCheckoutPage
            priceLabel={payLabel}
            productLabel={productLabel}
            productWord={productWord}
            benefits={offer.benefits}
            photoUrl={photoUrl}
            displayName={displayName}
            checkout={checkout}
            busy={busy}
            error={error}
            paid={step === "paid"}
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

        <DashboardModalCloseButton onClose={onClose} disabled={busy} />

        {step === "pick" ? (
          <MembershipUnlockPitch
            kind={membershipUnlockKindFromOffer(offer, trialEnded)}
            offer={offer}
            busy={busy}
            error={error}
            onUnlock={() => void startCheckout()}
          />
        ) : null}
      </div>
    </DashboardModalScrim>,
    document.body
  );
}

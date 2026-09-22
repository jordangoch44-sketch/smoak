"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
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

function ProCheckoutWordmark({ tier }: { tier: string }) {
  const plus = tier === "PRO+";
  return (
    <p className="boost-checkout-spotlight__word pro-checkout-spotlight__word">
      <span className="pro-checkout-wordmark__brand">Smoac</span>
      <span
        className={cn(
          "pro-checkout-wordmark__tier",
          plus && "pro-checkout-wordmark__tier--plus"
        )}
      >
        {plus ? "PRO+" : "Pro"}
      </span>
    </p>
  );
}

function ProBenefitGlyph({ title }: { title: string }) {
  return (
    <span className="pro-checkout-benefits__icon" aria-hidden>
      <svg viewBox="0 0 24 24" className="pro-checkout-benefits__glyph">
        {proBenefitGlyph(title)}
      </svg>
    </span>
  );
}

function proBenefitGlyph(title: string): ReactNode {
  switch (title) {
    case "Full profile analytics":
      return (
        <>
          <rect x="3.6" y="12.2" width="4.1" height="7.2" rx="1.15" fill="currentColor" opacity="0.45" />
          <rect x="9.95" y="8.1" width="4.1" height="11.3" rx="1.15" fill="currentColor" opacity="0.72" />
          <rect x="16.3" y="4.2" width="4.1" height="15.2" rx="1.15" fill="currentColor" />
        </>
      );
    case "Visibility and ranking intelligence":
      return (
        <>
          <path
            fill="currentColor"
            d="M8.1 4.2h7.8v5.1a3.9 3.9 0 0 1-7.8 0V4.2z"
          />
          <path
            fill="currentColor"
            opacity="0.55"
            d="M8.2 6.1H5.4A2.7 2.7 0 0 0 8 9.7V6.1zm7.6 0h2.8A2.7 2.7 0 0 1 16 9.7V6.1z"
          />
          <path
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            d="M12 13.2v2.5M9.1 19.4h5.8"
          />
        </>
      );
    case "Client engagement metrics":
      return (
        <>
          <circle cx="9" cy="8.1" r="2.45" fill="currentColor" />
          <circle cx="15.7" cy="9" r="1.9" fill="currentColor" opacity="0.62" />
          <path
            fill="currentColor"
            d="M4.4 18.6c.55-2.7 2.45-4.1 4.6-4.1s4.05 1.4 4.6 4.1H4.4z"
          />
          <path
            fill="currentColor"
            opacity="0.62"
            d="M13.3 18.6c.3-1.7 1.35-2.9 2.7-3.2 1.15.15 2.15 1.05 2.6 3.2h-5.3z"
          />
        </>
      );
    case "Free 1st session marketplace placement":
      return (
        <path
          fill="currentColor"
          d="M12 2.8 14.05 8.7h6.15l-4.95 3.7 1.9 6.05L12 14.8 6.85 18.45l1.9-6.05-4.95-3.7h6.15L12 2.8z"
        />
      );
    case "Growth insights on your live profile":
      return (
        <>
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 16.6 10 11.1l3 2.5 6.1-7"
          />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 6.6H19.2V12.3"
          />
        </>
      );
    case "Intro video above your bio":
    case "Up to 5 phone videos, 45 seconds each":
      return (
        <>
          <rect
            x="3.4"
            y="5"
            width="17.2"
            height="14"
            rx="3.2"
            fill="currentColor"
            opacity="0.22"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path fill="currentColor" d="M10 8.7v6.6L16.1 12 10 8.7z" />
        </>
      );
    case "Client results under Specialties":
      return (
        <>
          <rect x="3.2" y="6.4" width="12.2" height="12.2" rx="2.2" fill="currentColor" opacity="0.4" />
          <rect x="8.2" y="4.2" width="12.4" height="12.4" rx="2.2" fill="currentColor" />
          <path
            fill="#041018"
            d="M11.2 13.6 13.3 11l2.1 2.4 1.3-1.2 2.2 3.2H11.2z"
          />
          <circle cx="16.7" cy="7.7" r="1.05" fill="#041018" />
        </>
      );
    case "20% off Boost campaigns":
      return (
        <>
          <circle cx="8.2" cy="8.2" r="2.05" fill="currentColor" />
          <circle cx="15.8" cy="15.8" r="2.05" fill="currentColor" />
          <path
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            d="M16.6 7.4 7.4 16.6"
          />
        </>
      );
    case "Everything in Pro":
      return (
        <>
          <circle cx="12" cy="12" r="8.2" fill="currentColor" opacity="0.22" />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12.2 10.7 15l5.3-6"
          />
        </>
      );
    default:
      return (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.5 12.2 10.2 16 17.5 8"
        />
      );
  }
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
            <stop offset="42%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <mask id={maskId}>
            <rect width="200" height="200" fill="#fff" />
            <circle cx="100" cy="100" r="64" fill="#000" />
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
          "dashboard-modal__content dashboard-modal__content--boost dashboard-modal__content--boost-pay dashboard-modal__content--pro-pay",
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
              <ProCheckoutWordmark tier={productWord} />
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
              <ProCheckoutWordmark tier={productWord} />
              <ul className="pro-checkout-benefits">
                {benefits.map((benefit) => (
                  <li key={benefit.title}>
                    <ProBenefitGlyph title={benefit.title} />
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

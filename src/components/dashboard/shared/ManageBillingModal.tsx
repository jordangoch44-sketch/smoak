"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  SMOAC_PRO_PLUS_PRICE_LABEL,
  SMOAC_PRO_PRICE_LABEL,
} from "@/lib/specialist-premium";
import {
  fetchManageBilling,
  postManageBilling,
} from "@/lib/stripe/manage-billing-client";
import type {
  ManageBillingPayload,
  ManageBillingPaymentMethod,
  ManageBillingSubscription,
} from "@/lib/stripe/manage-billing-types";
import { createEmbeddedSubscriptionCheckout } from "@/lib/stripe/subscription-checkout";
import type { SmoacMembershipProduct } from "@/lib/stripe/products";
import { accountDeletionMailto } from "@/lib/site-contact";
import { PageWaitState } from "@/components/brand/PageWaitState";
import { DashboardButton } from "./DashboardButton";
import {
  DASHBOARD_MODAL_DIALOG_POINTER_PROPS,
  DashboardModalCloseButton,
  DashboardModalScrim,
} from "./DashboardModalScrim";
import { StripeEmbeddedCheckout } from "./StripeEmbeddedCheckout";

interface ManageBillingModalProps {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

type Step = "overview" | "update-card" | "confirm-cancel" | "checkout";

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(ms);
}

function formatCard(pm: ManageBillingPaymentMethod): string {
  if (pm.brand === "link") return "Link";
  const brand =
    pm.brand === "amex"
      ? "Amex"
      : pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1);
  return pm.last4 ? `${brand} ···· ${pm.last4}` : brand;
}

function formatExpiry(pm: ManageBillingPaymentMethod): string | null {
  if (!pm.expMonth || !pm.expYear) return null;
  return `${String(pm.expMonth).padStart(2, "0")}/${String(pm.expYear).slice(-2)}`;
}

function statusCopy(billing: ManageBillingPayload): string {
  if (billing.cancelAtPeriodEnd) return "Cancels at period end";
  if (billing.status === "past_due") return "Past due";
  if (billing.status === "trialing") return "Trialing";
  if (billing.status === "active") return "Active";
  if (billing.complimentary === "trial") return "Complimentary trial";
  if (billing.complimentary === "admin") return "Complimentary access";
  if (billing.status === "none" || billing.status === "canceled") return "Free";
  return billing.status;
}

export function ManageBillingModal({
  open,
  onClose,
  onChanged,
}: ManageBillingModalProps) {
  const [step, setStep] = useState<Step>("overview");
  const [billing, setBilling] = useState<ManageBillingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ManageBillingSubscription | null>(
    null
  );
  const [checkout, setCheckout] = useState<{
    clientSecret: string;
    product: SmoacMembershipProduct;
    label: string;
    priceLabel: string;
  } | null>(null);
  const [justPaid, setJustPaid] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setError(null);
    setBusy(false);
    setSetupSecret(null);
    setCancelTarget(null);
    setCheckout(null);
    setJustPaid(false);
    setStep("overview");
    setBilling(null);

    void fetchManageBilling().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBilling(result.billing);
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelled = true;
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  function applyBilling(next: ManageBillingPayload) {
    setBilling(next);
    onChanged?.();
  }

  async function startCardUpdate() {
    setBusy(true);
    setError(null);
    const result = await postManageBilling({ action: "setup-intent" });
    if (!result.ok || !result.clientSecret) {
      setError(result.ok ? "Could not start card update." : result.error);
      setBusy(false);
      return;
    }
    setSetupSecret(result.clientSecret);
    setStep("update-card");
    setBusy(false);
  }

  async function saveCard(paymentMethodId?: string) {
    if (!paymentMethodId) {
      setError("Card saved in Stripe, but it could not be attached. Try again.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await postManageBilling({
      action: "save-payment-method",
      paymentMethodId,
    });
    if (!result.ok || !result.billing) {
      setError(result.ok ? "Could not save card." : result.error);
      setBusy(false);
      return;
    }
    applyBilling(result.billing);
    setSetupSecret(null);
    setStep("overview");
    setBusy(false);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setBusy(true);
    setError(null);
    const result = await postManageBilling({
      action: "cancel",
      subscriptionId: cancelTarget.id,
    });
    if (!result.ok || !result.billing) {
      setError(result.ok ? "Could not cancel." : result.error);
      setBusy(false);
      return;
    }
    applyBilling(result.billing);
    setCancelTarget(null);
    setStep("overview");
    setBusy(false);
  }

  async function resume(subscriptionId: string) {
    setBusy(true);
    setError(null);
    const result = await postManageBilling({
      action: "resume",
      subscriptionId,
    });
    if (!result.ok || !result.billing) {
      setError(result.ok ? "Could not resume." : result.error);
      setBusy(false);
      return;
    }
    applyBilling(result.billing);
    setBusy(false);
  }

  async function startCheckout(product: SmoacMembershipProduct) {
    setBusy(true);
    setError(null);
    const result = await createEmbeddedSubscriptionCheckout(product);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setCheckout({
      clientSecret: result.checkout.clientSecret,
      product,
      label: result.checkout.label,
      priceLabel: result.checkout.priceLabel,
    });
    setStep("checkout");
    setBusy(false);
  }

  async function afterPaid() {
    setJustPaid(true);
    const result = await fetchManageBilling();
    if (result.ok) applyBilling(result.billing);
    setCheckout(null);
    setStep("overview");
  }

  if (!open || typeof document === "undefined") return null;

  const paidMembership = Boolean(billing?.membershipSubscriptionId);
  const membership = billing?.subscriptions.find((s) => s.kind === "plan");
  const addons = billing?.subscriptions.filter((s) => s.kind === "addon") ?? [];
  const showUpgrade = Boolean(billing) && !paidMembership && !justPaid;

  return createPortal(
    <DashboardModalScrim onDismiss={onClose}>
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--billing"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-billing-title"
        {...DASHBOARD_MODAL_DIALOG_POINTER_PROPS}
      >
        <div className="dashboard-modal__glow" aria-hidden />
        <DashboardModalCloseButton onClose={onClose} />

        <div className="dashboard-modal__content">
          {step === "overview" ? (
            <>
              <p className="dashboard-modal__eyebrow">Account</p>
              <h2 id="manage-billing-title" className="dashboard-modal__title">
                Manage billing
              </h2>
              {!billing && !error ? (
                <PageWaitState label="Loading your plan" compact />
              ) : null}
              {error ? (
                <p className="dashboard-modal__error" role="alert">
                  {error}
                </p>
              ) : null}
              {billing ? (
                <>
                  {justPaid && !paidMembership ? (
                    <p className="dashboard-modal__body">
                      Payment received. Your plan will unlock shortly.
                    </p>
                  ) : null}

                  {!billing.stripeConfigured ? (
                    <p className="dashboard-modal__body">
                      Card updates and invoices aren’t connected yet. Your current
                      plan still shows below.
                    </p>
                  ) : null}

                  <div className="dashboard-billing__card">
                    <div className="dashboard-account-card__row">
                      <span className="dashboard-account-card__label">Plan</span>
                      <span className="dashboard-account-card__value">
                        {billing.displayPlan}
                      </span>
                    </div>
                    <div className="dashboard-account-card__row">
                      <span className="dashboard-account-card__label">Status</span>
                      <span className="dashboard-account-card__value">
                        {statusCopy(billing)}
                      </span>
                    </div>
                    {billing.currentPeriodEnd ? (
                    <div className="dashboard-account-card__row">
                      <span className="dashboard-account-card__label">
                        {billing.cancelAtPeriodEnd ? "Ends" : "Renews"}
                      </span>
                      <span className="dashboard-account-card__value">
                        {formatDate(billing.currentPeriodEnd)}
                      </span>
                    </div>
                    ) : null}
                    {membership && membership.monthlyCents > 0 ? (
                      <div className="dashboard-account-card__row">
                        <span className="dashboard-account-card__label">
                          Membership
                        </span>
                        <span className="dashboard-account-card__value">
                          {formatUsd(membership.monthlyCents)}/mo
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {billing.status === "past_due" ? (
                    <p className="dashboard-modal__error" role="alert">
                      Payment failed. Update your card to keep this plan.
                    </p>
                  ) : null}

                  {billing.complimentary === "trial" && !paidMembership ? (
                    <p className="dashboard-modal__body">
                      Complimentary Pro — no card on file. Continue before the
                      trial ends to keep analytics.
                    </p>
                  ) : null}

                  {billing.complimentary === "admin" && !paidMembership ? (
                    <p className="dashboard-modal__body">
                      This access was granted by SMOAC. There’s no Stripe
                      membership to cancel.
                    </p>
                  ) : null}

                  {billing.canUpdatePaymentMethod ? (
                    <div className="dashboard-billing__card">
                      <p className="dashboard-billing__section-title">Payment</p>
                      <div className="dashboard-account-card__row">
                        <span className="dashboard-account-card__label">Card</span>
                        <span className="dashboard-account-card__value">
                          {billing.paymentMethod
                            ? formatCard(billing.paymentMethod)
                            : "None on file"}
                        </span>
                      </div>
                      {billing.paymentMethod &&
                      formatExpiry(billing.paymentMethod) ? (
                        <div className="dashboard-account-card__row">
                          <span className="dashboard-account-card__label">
                            Expires
                          </span>
                          <span className="dashboard-account-card__value">
                            {formatExpiry(billing.paymentMethod)}
                          </span>
                        </div>
                      ) : null}
                      <DashboardButton
                        variant="link"
                        className="dashboard-billing__link"
                        onClick={() => void startCardUpdate()}
                        disabled={busy}
                      >
                        {billing.paymentMethod ? "Update card" : "Add a card"}
                      </DashboardButton>
                    </div>
                  ) : null}

                  {addons.length > 0 ? (
                    <div className="dashboard-billing__card">
                      <p className="dashboard-billing__section-title">
                        Placement ads
                      </p>
                      {addons.map((addon) => (
                        <div key={addon.id} className="dashboard-billing__addon">
                          <div className="dashboard-account-card__row">
                            <span className="dashboard-account-card__label">
                              {addon.label}
                            </span>
                            <span className="dashboard-account-card__value">
                              {formatUsd(addon.monthlyCents)}/mo
                            </span>
                          </div>
                          {addon.cancelAtPeriodEnd ? (
                            <DashboardButton
                              variant="link"
                              className="dashboard-billing__link"
                              onClick={() => void resume(addon.id)}
                              disabled={busy}
                            >
                              Keep this placement
                            </DashboardButton>
                          ) : (
                            <DashboardButton
                              variant="link"
                              className="dashboard-billing__link"
                              onClick={() => {
                                setCancelTarget(addon);
                                setStep("confirm-cancel");
                              }}
                              disabled={busy}
                            >
                              Cancel at period end
                            </DashboardButton>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {billing.invoices.length > 0 ? (
                    <div className="dashboard-billing__card">
                      <p className="dashboard-billing__section-title">Invoices</p>
                      <ul className="dashboard-billing__invoices">
                        {billing.invoices.map((invoice) => {
                          const inner = (
                            <>
                              <span>
                                {formatDate(invoice.createdAt)}
                                <em>{invoice.status}</em>
                              </span>
                              <strong>{formatUsd(invoice.amountCents)}</strong>
                            </>
                          );
                          return (
                            <li key={invoice.id}>
                              {invoice.hostedInvoiceUrl ? (
                                <a
                                  href={invoice.hostedInvoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {inner}
                                </a>
                              ) : (
                                <span className="dashboard-billing__invoice-static">
                                  {inner}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {showUpgrade ? (
                    <>
                      <DashboardButton
                        className="dashboard-pro-upgrade-btn"
                        onClick={() => void startCheckout("premium")}
                        disabled={busy || !billing.stripeConfigured}
                      >
                        {busy
                          ? "Loading…"
                          : `Continue Pro · ${SMOAC_PRO_PRICE_LABEL}`}
                      </DashboardButton>
                      <FastActivateButton
                        className="dashboard-modal__secondary"
                        onActivate={() => void startCheckout("platinum")}
                        disabled={busy || !billing.stripeConfigured}
                      >
                        Or PRO+ · {SMOAC_PRO_PLUS_PRICE_LABEL}
                      </FastActivateButton>
                    </>
                  ) : null}

                  {billing.canResumeMembership && membership ? (
                    <DashboardButton
                      onClick={() => void resume(membership.id)}
                      disabled={busy}
                    >
                      {busy ? "Saving…" : "Keep my plan"}
                    </DashboardButton>
                  ) : null}

                  {billing.canCancelMembership && membership ? (
                    <FastActivateButton
                      className="dashboard-modal__secondary dashboard-billing__cancel"
                      onActivate={() => {
                        setCancelTarget(membership);
                        setStep("confirm-cancel");
                      }}
                      disabled={busy}
                    >
                      Cancel plan
                    </FastActivateButton>
                  ) : null}

                  <a
                    className="dashboard-billing__link"
                    href={accountDeletionMailto("specialist")}
                  >
                    Request account deletion
                  </a>
                </>
              ) : null}
            </>
          ) : null}

          {step === "update-card" && setupSecret ? (
            <>
              <FastActivateButton
                className="dashboard-modal__secondary"
                onActivate={() => {
                  setSetupSecret(null);
                  setStep("overview");
                }}
              >
                ← Back
              </FastActivateButton>
              <p className="dashboard-modal__eyebrow">Payment</p>
              <h2 id="manage-billing-title" className="dashboard-modal__title">
                Update card
              </h2>
              <p className="dashboard-modal__body">
                This becomes the card for Pro and any monthly placements.
              </p>
              {error ? (
                <p className="dashboard-modal__error" role="alert">
                  {error}
                </p>
              ) : null}
              <StripeEmbeddedCheckout
                clientSecret={setupSecret}
                productLabel="Billing"
                priceLabel=""
                submitLabel="Save card"
                walletMode="setup"
                intentMode="setup"
                onPaid={(result) => void saveCard(result?.paymentMethodId)}
                onError={(message) => setError(message || null)}
              />
            </>
          ) : null}

          {step === "confirm-cancel" && cancelTarget ? (
            <>
              <p className="dashboard-modal__eyebrow">Cancel</p>
              <h2 id="manage-billing-title" className="dashboard-modal__title">
                Cancel {cancelTarget.label}?
              </h2>
              <p id="manage-billing-desc" className="dashboard-modal__body">
                You’ll keep access until {formatDate(cancelTarget.currentPeriodEnd)}.
                After that this {cancelTarget.kind === "plan" ? "plan" : "placement"}{" "}
                stops — no further charges.
              </p>
              {error ? (
                <p className="dashboard-modal__error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="dashboard-modal__actions">
                <FastActivateButton
                  className="smoac-control dashboard-modal__cancel"
                  onActivate={() => {
                    setCancelTarget(null);
                    setStep("overview");
                  }}
                  disabled={busy}
                >
                  Keep it
                </FastActivateButton>
                <DashboardButton onClick={() => void confirmCancel()} disabled={busy}>
                  {busy ? "Canceling…" : "Confirm"}
                </DashboardButton>
              </div>
            </>
          ) : null}

          {step === "checkout" && checkout ? (
            <>
              <FastActivateButton
                className="dashboard-modal__secondary"
                onActivate={() => {
                  setCheckout(null);
                  setStep("overview");
                }}
              >
                ← Back
              </FastActivateButton>
              <p className="dashboard-modal__eyebrow">SMOAC</p>
              <h2 id="manage-billing-title" className="dashboard-modal__title">
                {checkout.label}
              </h2>
              <p className="dashboard-modal__body">
                Billed monthly. Cancel anytime from this screen.
              </p>
              <p className="dashboard-modal__price">{checkout.priceLabel}</p>
              {error ? (
                <p className="dashboard-modal__error" role="alert">
                  {error}
                </p>
              ) : null}
              <StripeEmbeddedCheckout
                clientSecret={checkout.clientSecret}
                productLabel={checkout.label}
                priceLabel={checkout.priceLabel}
                onPaid={() => void afterPaid()}
                onError={(message) => setError(message || null)}
              />
            </>
          ) : null}
        </div>
      </div>
    </DashboardModalScrim>,
    document.body
  );
}

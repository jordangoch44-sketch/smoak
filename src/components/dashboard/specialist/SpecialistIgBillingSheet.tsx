"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { PageWaitState } from "@/components/brand/PageWaitState";
import { ManageBillingModal } from "@/components/dashboard/shared";
import { fetchManageBilling } from "@/lib/stripe/manage-billing-client";
import type {
  ManageBillingInvoice,
  ManageBillingPayload,
  ManageBillingPaymentMethod,
} from "@/lib/stripe/manage-billing-types";

interface SpecialistIgBillingSheetProps {
  open: boolean;
  onClose: () => void;
}

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

function BillingRow({
  label,
  value,
  onClick,
  href,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
  href?: string;
}) {
  const interactive = Boolean(onClick || href);
  const className = [
    interactive ? "smoac-control" : null,
    "ig-profile-edit__row ig-profile-edit__row--settings",
    value == null && "ig-profile-edit__row--action",
    !interactive && "ig-profile-edit__row--static",
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <div className="ig-profile-edit__row-left">
        <span className="ig-profile-edit__row-label">{label}</span>
      </div>
      {value != null ? (
        <span className="ig-profile-edit__row-value">{value}</span>
      ) : null}
      {interactive ? (
        <span className="ig-profile-edit__row-chevron" aria-hidden>
          ›
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}

function invoiceRow(invoice: ManageBillingInvoice): ReactNode {
  const label = formatDate(invoice.createdAt);
  const value = `${formatUsd(invoice.amountCents)}${
    invoice.status ? ` · ${invoice.status}` : ""
  }`;
  return (
    <BillingRow
      key={invoice.id}
      label={label}
      value={value}
      href={invoice.hostedInvoiceUrl ?? undefined}
    />
  );
}

export function SpecialistIgBillingSheet({
  open,
  onClose,
}: SpecialistIgBillingSheetProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [billing, setBilling] = useState<ManageBillingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBilling(null);
    let cancelled = false;
    void fetchManageBilling().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBilling(result.billing);
    });
    return () => {
      cancelled = true;
    };
  }, [open, reloadToken]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !manageOpen) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, manageOpen, onClose]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const membership = billing?.subscriptions.find((s) => s.kind === "plan");
  const addons = billing?.subscriptions.filter((s) => s.kind === "addon") ?? [];
  const paymentValue = billing?.paymentMethod
    ? formatCard(billing.paymentMethod)
    : "Add";

  return createPortal(
    <>
      <div
        className="specialist-edit-profile-page specialist-edit-profile-page--billing"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="specialist-edit-profile-page__chrome">
          <FastActivateButton
            className="smoac-control specialist-edit-profile-page__back"
            aria-label="Back to edit profile"
            onActivate={onClose}
          >
            <ChevronLeftIcon className="specialist-edit-profile-page__back-icon" />
          </FastActivateButton>
          <h1 id={titleId} className="specialist-edit-profile-page__title">
            Billing
          </h1>
          <span className="specialist-edit-profile-page__spacer" aria-hidden />
        </header>

        <div className="specialist-edit-profile-page__body">
          <div className="ig-profile-edit specialist-ig-billing">
            {!billing && !error ? (
              <PageWaitState label="Loading billing" compact />
            ) : null}
            {error ? (
              <p className="specialist-ig-billing__error" role="alert">
                {error}
              </p>
            ) : null}

            {billing ? (
              <>
                <div className="ig-profile-edit__section-label">
                  Payment method
                </div>
                <div className="ig-profile-edit__list" role="list">
                  <BillingRow
                    label="Card"
                    value={paymentValue}
                    onClick={() => setManageOpen(true)}
                  />
                </div>

                <div className="ig-profile-edit__section-label">
                  Subscription
                </div>
                <div className="ig-profile-edit__list" role="list">
                  <BillingRow
                    label="Plan"
                    value={billing.displayPlan}
                    onClick={() => setManageOpen(true)}
                  />
                  <BillingRow label="Status" value={statusCopy(billing)} />
                  {billing.currentPeriodEnd ? (
                    <BillingRow
                      label={billing.cancelAtPeriodEnd ? "Ends" : "Renews"}
                      value={formatDate(billing.currentPeriodEnd)}
                    />
                  ) : null}
                  {membership && membership.monthlyCents > 0 ? (
                    <BillingRow
                      label="Membership"
                      value={`${formatUsd(membership.monthlyCents)}/mo`}
                    />
                  ) : null}
                </div>

                {addons.length > 0 ? (
                  <>
                    <div className="ig-profile-edit__section-label">Boosts</div>
                    <div className="ig-profile-edit__list" role="list">
                      {addons.map((addon) => (
                        <BillingRow
                          key={addon.id}
                          label={addon.label}
                          value={`${formatUsd(addon.monthlyCents)}/mo`}
                          onClick={() => setManageOpen(true)}
                        />
                      ))}
                    </div>
                  </>
                ) : null}

                <div className="ig-profile-edit__section-label">
                  Billing history
                </div>
                <div className="ig-profile-edit__list" role="list">
                  {billing.invoices.length > 0 ? (
                    billing.invoices.map(invoiceRow)
                  ) : (
                    <BillingRow label="Invoices" value="None yet" />
                  )}
                </div>

                <div className="ig-profile-edit__list" role="list">
                  <BillingRow
                    label="Manage billing"
                    onClick={() => setManageOpen(true)}
                  />
                </div>

                <p className="ig-profile-edit__hint specialist-ig-billing__hint">
                  Membership and Boosts are billed through Stripe. Tap a row to
                  update your card, change plans, or cancel.
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <ManageBillingModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        onChanged={() => setReloadToken((n) => n + 1)}
      />
    </>,
    document.body
  );
}

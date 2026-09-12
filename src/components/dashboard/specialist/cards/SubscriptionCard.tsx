"use client";

import { useEffect, useState } from "react";
import type { SpecialistSubscription } from "@/types/specialist-dashboard";
import { SMOAC_PRO_PRICE_LABEL } from "@/lib/specialist-premium";
import { membershipPlanLabel } from "@/lib/stripe/products";
import { accountDeletionMailto } from "@/lib/site-contact";
import { PageWaitState } from "@/components/brand/PageWaitState";
import { DashboardButton, DashboardSection, ManageBillingModal } from "@/components/dashboard/shared";

interface BillingLine {
  product: string;
  label: string;
  kind: "plan" | "addon";
  monthlyCents: number;
  status: string;
}

interface BillingSummary {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  lines: BillingLine[];
  membershipMonthlyCents: number;
  adSpendMonthlyCents: number;
  totalMonthlyCents: number;
  hasStripeCustomer: boolean;
}

interface SubscriptionCardProps {
  subscription: SpecialistSubscription;
  onOpenBoost?: () => void;
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function formatPeriodEnd(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(ms);
}

export function SubscriptionCard({
  subscription,
  onOpenBoost,
}: SubscriptionCardProps) {
  const [billingOpen, setBillingOpen] = useState(false);
  const [summaryNonce, setSummaryNonce] = useState(0);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/stripe/billing-summary", { credentials: "include" })
      .then((res) => res.json())
      .then((body: BillingSummary & { ok?: boolean; error?: string }) => {
        if (cancelled) return;
        if (!body?.ok && body.error) {
          setSummaryError(body.error);
          return;
        }
        setSummaryError(null);
        setSummary({
          plan: body.plan,
          status: body.status,
          currentPeriodEnd: body.currentPeriodEnd,
          lines: Array.isArray(body.lines) ? body.lines : [],
          membershipMonthlyCents: body.membershipMonthlyCents ?? 0,
          adSpendMonthlyCents: body.adSpendMonthlyCents ?? 0,
          totalMonthlyCents: body.totalMonthlyCents ?? 0,
          hasStripeCustomer: Boolean(body.hasStripeCustomer),
        });
      })
      .catch(() => {
        if (!cancelled) setSummaryError("Could not load billing summary.");
      });
    return () => {
      cancelled = true;
    };
  }, [summaryNonce]);

  const adLines = summary?.lines.filter((l) => l.kind === "addon") ?? [];
  const planLines = summary?.lines.filter((l) => l.kind === "plan") ?? [];

  return (
    <DashboardSection
      title="Subscription / account settings"
      description="Plan, ad spend, and billing for your SMOAC placements"
    >
      <div className="dashboard-account-card">
        <div className="dashboard-account-card__row">
          <span className="dashboard-account-card__label">Plan</span>
          <span className="dashboard-account-card__value">
            {summary?.plan &&
            (summary.plan === "premium" || summary.plan === "platinum")
              ? membershipPlanLabel(summary.plan)
              : subscription.plan}
          </span>
        </div>
        <div className="dashboard-account-card__row">
          <span className="dashboard-account-card__label">Status</span>
          <span className="dashboard-account-card__value">
            {summary?.status && summary.status !== "none"
              ? summary.status
              : subscription.status}
          </span>
        </div>
        {subscription.isPremium || (summary && summary.plan !== "free") ? (
          <div className="dashboard-account-card__row">
            <span className="dashboard-account-card__label">Renews</span>
            <span className="dashboard-account-card__value">
              {summary?.currentPeriodEnd
                ? formatPeriodEnd(summary.currentPeriodEnd)
                : subscription.renewsOn}
            </span>
          </div>
        ) : (
          <div className="dashboard-account-card__row">
            <span className="dashboard-account-card__label">Pro</span>
            <span className="dashboard-account-card__value">
              {SMOAC_PRO_PRICE_LABEL}
            </span>
          </div>
        )}

        <div className="dashboard-ad-spend">
          <p className="dashboard-ad-spend__title">Ad spend</p>
          <p className="dashboard-ad-spend__lede">
            Monthly paid placements (Sponsored, Featured, category, ranking
            boosts) — separate from Pro analytics.
          </p>

          {summaryError ? (
            <p className="dashboard-account-card__error" role="alert">
              {summaryError}
            </p>
          ) : null}

          {!summary && !summaryError ? (
            <PageWaitState label="Loading ad spend" compact />
          ) : null}

          {summary ? (
            <>
              <div className="dashboard-account-card__row">
                <span className="dashboard-account-card__label">
                  Placement ads / mo
                </span>
                <span className="dashboard-account-card__value">
                  {formatUsd(summary.adSpendMonthlyCents)}
                </span>
              </div>
              <div className="dashboard-account-card__row">
                <span className="dashboard-account-card__label">
                  Membership / mo
                </span>
                <span className="dashboard-account-card__value">
                  {formatUsd(summary.membershipMonthlyCents)}
                </span>
              </div>
              <div className="dashboard-account-card__row dashboard-account-card__row--total">
                <span className="dashboard-account-card__label">
                  Total / mo
                </span>
                <span className="dashboard-account-card__value">
                  {formatUsd(summary.totalMonthlyCents)}
                </span>
              </div>

              {adLines.length > 0 ? (
                <ul className="dashboard-ad-spend__list">
                  {adLines.map((line) => (
                    <li key={`${line.product}-${line.status}`}>
                      <span>{line.label}</span>
                      <strong>{formatUsd(line.monthlyCents)}/mo</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dashboard-ad-spend__empty">
                  No active placement ads yet.
                </p>
              )}

              {onOpenBoost ? (
                <DashboardButton
                  variant="link"
                  className="dashboard-ad-spend__boost"
                  onClick={onOpenBoost}
                >
                  {adLines.length > 0 ? "Add a placement" : "Boost your profile"}
                </DashboardButton>
              ) : null}

              {planLines.length > 0 ? (
                <ul className="dashboard-ad-spend__list dashboard-ad-spend__list--plan">
                  {planLines.map((line) => (
                    <li key={`${line.product}-plan`}>
                      <span>{line.label}</span>
                      <strong>{formatUsd(line.monthlyCents)}/mo</strong>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>

        <DashboardButton
          variant="link"
          onClick={() => setBillingOpen(true)}
        >
          Manage billing →
        </DashboardButton>
        <a
          className="dashboard-account-delete-link"
          href={accountDeletionMailto("specialist")}
        >
          Request account deletion
        </a>
      </div>
      <ManageBillingModal
        open={billingOpen}
        onClose={() => setBillingOpen(false)}
        onChanged={() => setSummaryNonce((n) => n + 1)}
      />
    </DashboardSection>
  );
}

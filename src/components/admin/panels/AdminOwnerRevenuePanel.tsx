"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DashboardGrid,
  DashboardMetricCard,
  DashboardSection,
} from "@/components/dashboard";
import { AdminCollapsible } from "@/components/admin/AdminCollapsible";
import { AdminDonutChart } from "@/components/admin/charts/AdminDonutChart";
import { formatBillingCents } from "@/lib/admin-specialist-billing-service";

interface StripeBillingRow {
  userId: string;
  specialistProfileId: string | null;
  specialistName: string;
  email: string;
  status: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  monthlyCents: number;
  isPaying: boolean;
}

interface AdminRevenueApiResponse {
  ok: boolean;
  message?: string;
  stripeConfigured?: boolean;
  stripe?: {
    mrrCents: number;
    payingCount: number;
    dataSource: "stripe";
  } | null;
  premiumMonthlyCents?: number;
  attributedMrrCents?: number;
  billingRows?: StripeBillingRow[];
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

function formatPeriodEnd(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Owner Revenue — Stripe / specialist_billing only (no catalog estimates). */
export function AdminOwnerRevenuePanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminRevenueApiResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch("/api/admin/revenue", { credentials: "include" })
      .then((res) => res.json())
      .then((body: AdminRevenueApiResponse) => {
        if (cancelled) return;
        if (!body?.ok) {
          setError(body?.message ?? "Could not load revenue.");
          setData(null);
          return;
        }
        setData(body);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load revenue.");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const billingRows = data?.billingRows ?? [];
  const payingRows = useMemo(
    () => billingRows.filter((row) => row.isPaying),
    [billingRows]
  );
  const issueRows = useMemo(
    () =>
      billingRows.filter((row) =>
        ["past_due", "unpaid", "canceled", "incomplete"].includes(row.status)
      ),
    [billingRows]
  );

  /* Primary truth = specialist_billing (webhook sync). Stripe account MRR is cross-check only. */
  const heroMrrCents = data?.attributedMrrCents ?? 0;
  const payingCount = payingRows.length;
  const stripeCrossCheck = data?.stripe?.dataSource === "stripe" ? data.stripe : null;
  const stripeDiverges =
    stripeCrossCheck != null &&
    (stripeCrossCheck.payingCount !== payingCount ||
      stripeCrossCheck.mrrCents !== heroMrrCents);

  const chartSegments = [
    {
      id: "paying",
      label: "Paying",
      value: payingRows.length,
      color: "rgb(var(--aurora-lavender-rgb))",
    },
    {
      id: "issues",
      label: "Needs attention",
      value: issueRows.length,
      color: "rgb(252, 165, 165)",
    },
    {
      id: "other",
      label: "Other",
      value: Math.max(
        0,
        billingRows.length - payingRows.length - issueRows.length
      ),
      color: "rgb(var(--aurora-violet-rgb))",
    },
  ].filter((segment) => segment.value > 0);

  return (
    <DashboardSection
      title="Revenue"
      description="Live Stripe settlement from specialist_billing — no catalog estimates."
    >
      {loading ? <p className="admin-empty">Loading Stripe billing…</p> : null}
      {error ? <p className="admin-status-error">{error}</p> : null}

      {!loading && data ? (
        <>
          <p className="admin-status-note">
            {data.stripeConfigured
              ? payingCount > 0
                ? `SMOAC billing · ${payingCount} paying specialist${payingCount === 1 ? "" : "s"} (from specialist_billing)`
                : "No SMOAC paid subscriptions in specialist_billing yet. Complimentary Pro trials do not count as revenue."
              : "Stripe is not configured on the server (STRIPE_SECRET_KEY). Billing rows still show webhook sync state when present."}
          </p>
          {stripeDiverges && stripeCrossCheck ? (
            <p className="admin-status-note">
              Stripe SMOAC-price cross-check:{" "}
              {formatBillingCents(stripeCrossCheck.mrrCents, { decimals: 0 })}{" "}
              MRR · {stripeCrossCheck.payingCount} sub
              {stripeCrossCheck.payingCount === 1 ? "" : "s"} — differs from
              billing table (check webhook sync).
            </p>
          ) : null}

          <div className="admin-revenue-hero">
            <div className="admin-revenue-hero__mrr">
              <span className="admin-revenue-hero__label">
                Monthly recurring revenue (SMOAC billing)
              </span>
              <span className="admin-revenue-hero__value">
                {formatBillingCents(heroMrrCents, { decimals: 0 })}
              </span>
            </div>
            <DashboardGrid className="admin-revenue-hero__grid">
              <DashboardMetricCard
                label="Paying specialists"
                value={String(payingCount)}
              />
              <DashboardMetricCard
                label="Billing rows"
                value={String(billingRows.length)}
              />
              <DashboardMetricCard
                label="Needs attention"
                value={String(issueRows.length)}
              />
              <DashboardMetricCard
                label="Pro price / mo"
                value={formatBillingCents(data.premiumMonthlyCents ?? 0, {
                  decimals: 2,
                })}
              />
            </DashboardGrid>
          </div>

          {chartSegments.length > 0 ? (
            <div className="admin-charts-grid admin-charts-grid--single">
              <AdminDonutChart
                title="Billing roster mix"
                segments={chartSegments}
                centerLabel="Accounts"
              />
            </div>
          ) : null}

          <div className="admin-owner-block">
            <h3 className="admin-owner-block__title">Paying specialists</h3>
            {payingRows.length === 0 ? (
              <p className="admin-empty">
                No active or trialing Stripe subscriptions yet.
              </p>
            ) : (
              <ul className="admin-card-list">
                {payingRows.map((row) => (
                  <li key={row.userId} className="admin-entity-card">
                    <h4 className="admin-entity-card__title">
                      {row.specialistName}
                    </h4>
                    <p className="admin-card__meta">
                      {row.email || "No email"} · {formatStatus(row.status)}
                      {row.cancelAtPeriodEnd ? " · cancels at period end" : ""}
                    </p>
                    <p className="admin-card__meta">
                      {formatBillingCents(row.monthlyCents, { decimals: 2 })}
                      /mo · renews {formatPeriodEnd(row.currentPeriodEnd)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <AdminCollapsible title="All Stripe billing rows" defaultOpen>
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--billing">
                <thead>
                  <tr>
                    <th>Specialist</th>
                    <th>Status</th>
                    <th>/ mo</th>
                    <th>Period end</th>
                    <th>Subscription</th>
                  </tr>
                </thead>
                <tbody>
                  {billingRows.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No specialist_billing rows yet.</td>
                    </tr>
                  ) : (
                    billingRows.map((row) => (
                      <tr key={row.userId}>
                        <td>
                          <div>{row.specialistName}</div>
                          <div className="admin-card__meta">{row.email || "—"}</div>
                        </td>
                        <td>
                          {formatStatus(row.status)}
                          {row.cancelAtPeriodEnd ? " · canceling" : ""}
                        </td>
                        <td className="admin-table__money">
                          {row.monthlyCents > 0
                            ? formatBillingCents(row.monthlyCents, {
                                decimals: 2,
                              })
                            : "—"}
                        </td>
                        <td>{formatPeriodEnd(row.currentPeriodEnd)}</td>
                        <td>
                          {row.stripeSubscriptionId
                            ? `${row.stripeSubscriptionId.slice(0, 18)}…`
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AdminCollapsible>
        </>
      ) : null}
    </DashboardSection>
  );
}

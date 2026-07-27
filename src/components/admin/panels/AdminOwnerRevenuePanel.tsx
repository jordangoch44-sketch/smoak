"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardGrid, DashboardMetricCard, DashboardSection } from "@/components/dashboard";
import { AdminCollapsible } from "@/components/admin/AdminCollapsible";
import { AdminDonutChart } from "@/components/admin/charts/AdminDonutChart";
import { SpecialistBillingBlock } from "@/components/admin/owner/SpecialistBillingBlock";
import {
  formatBillingCents,
  getAdminOwnerRevenueDashboard,
} from "@/lib/admin-specialist-billing-service";
import type { AdminSpecialistRow } from "@/hooks/useAdminDashboard";

interface AdminOwnerRevenuePanelProps {
  specialists: AdminSpecialistRow[];
}

interface AdminRevenueApiResponse {
  ok: boolean;
  stripe?: {
    mrrCents: number;
    payingCount: number;
    dataSource: "stripe";
  } | null;
  billingRows?: Array<{
    userId: string;
    specialistProfileId: string | null;
    status: string;
    stripeSubscriptionId: string | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  }>;
}

export function AdminOwnerRevenuePanel({ specialists }: AdminOwnerRevenuePanelProps) {
  const [liveStripe, setLiveStripe] = useState<
    AdminRevenueApiResponse["stripe"] | undefined
  >(undefined);
  const [stripeBillingCount, setStripeBillingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/revenue", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: AdminRevenueApiResponse | null) => {
        if (cancelled || !body?.ok) return;
        setLiveStripe(body.stripe ?? null);
        const active = (body.billingRows ?? []).filter((row) =>
          ["active", "trialing", "past_due"].includes(row.status)
        );
        setStripeBillingCount(active.length);
      })
      .catch(() => {
        if (!cancelled) setLiveStripe(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ownerRevenue = useMemo(
    () =>
      getAdminOwnerRevenueDashboard(
        specialists.map((row) => ({
          id: row.id,
          name: row.name,
          isPremium: row.isPremium,
          featured: row.featured,
          sponsored: row.sponsored,
          topRanked: row.topRanked,
        }))
      ),
    [specialists]
  );

  const { metrics, specialistBilling } = ownerRevenue;
  const hasStripeMrr = liveStripe?.dataSource === "stripe";
  const heroMrrCents = hasStripeMrr
    ? liveStripe.mrrCents
    : metrics.projectedMonthlyRecurringRevenueCents;

  const chartSegments = [
    {
      id: "tier",
      label: hasStripeMrr ? "Stripe subscriptions" : "Tier subscriptions",
      value: hasStripeMrr
        ? liveStripe.mrrCents / 100
        : metrics.tierRevenueCents / 100,
      color: "rgb(var(--aurora-lavender-rgb))",
    },
    {
      id: "addons",
      label: "Ad add-ons",
      value: hasStripeMrr ? 0 : metrics.addOnRevenueCents / 100,
      color: "rgb(var(--aurora-violet-rgb))",
    },
  ].filter((segment) => segment.value > 0);

  const payingSpecialists = specialistBilling.filter(
    (row) => row.totalMonthlyCents > 0
  );

  const dataLabel = hasStripeMrr
    ? `Stripe MRR · ${liveStripe.payingCount} paying subscription${liveStripe.payingCount === 1 ? "" : "s"}`
    : "Catalog estimate from live specialist flags (premium / featured / sponsored / top ranked). Ad add-ons are list-price only until Stripe placement billing ships.";

  return (
    <DashboardSection
      title="Revenue"
      description="Specialist tiers and paid add-ons — owner view."
    >
      <p className="admin-mock-label">{dataLabel}</p>
      {liveStripe !== undefined && stripeBillingCount > 0 ? (
        <p className="admin-mock-label">
          {stripeBillingCount} specialist billing row
          {stripeBillingCount === 1 ? "" : "s"} synced from Stripe webhooks.
        </p>
      ) : null}

      <div className="admin-revenue-hero">
        <div className="admin-revenue-hero__mrr">
          <span className="admin-revenue-hero__label">
            {hasStripeMrr
              ? "Monthly recurring revenue (Stripe)"
              : "Projected monthly recurring revenue"}
          </span>
          <span className="admin-revenue-hero__value">
            {formatBillingCents(heroMrrCents, { decimals: 0 })}
          </span>
        </div>
        <DashboardGrid className="admin-revenue-hero__grid">
          <DashboardMetricCard
            label={hasStripeMrr ? "Stripe MRR" : "Tier revenue"}
            value={formatBillingCents(
              hasStripeMrr ? liveStripe.mrrCents : metrics.tierRevenueCents,
              { decimals: 0 }
            )}
          />
          <DashboardMetricCard
            label="Add-on revenue"
            value={formatBillingCents(
              hasStripeMrr ? 0 : metrics.addOnRevenueCents,
              { decimals: 0 }
            )}
          />
          <DashboardMetricCard
            label="Total specialist revenue"
            value={formatBillingCents(
              hasStripeMrr ? liveStripe.mrrCents : metrics.totalSpecialistRevenueCents,
              { decimals: 0 }
            )}
          />
          <DashboardMetricCard
            label="Boosted ads revenue"
            value={formatBillingCents(
              hasStripeMrr ? 0 : metrics.boostedAdsRevenueCents,
              { decimals: 0 }
            )}
          />
        </DashboardGrid>
      </div>

      {chartSegments.length > 0 ? (
        <div className="admin-charts-grid admin-charts-grid--single">
          <AdminDonutChart
            title={hasStripeMrr ? "Stripe revenue mix" : "Tier vs add-on revenue"}
            segments={chartSegments}
            centerLabel="USD / mo"
            valuePrefix="$"
          />
        </div>
      ) : null}

      <div className="admin-owner-block">
        <h3 className="admin-owner-block__title">Revenue by specialist</h3>
        <ul className="admin-card-list">
          {payingSpecialists.map((billing) => (
            <li key={billing.specialistId} className="admin-entity-card">
              <h4 className="admin-entity-card__title">{billing.specialistName}</h4>
              <SpecialistBillingBlock billing={billing} />
            </li>
          ))}
        </ul>
        {payingSpecialists.length === 0 ? (
          <p className="admin-empty">No paying specialists yet.</p>
        ) : null}
      </div>

      <AdminCollapsible title="All specialists billing table">
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--billing">
            <thead>
              <tr>
                <th>Specialist</th>
                <th>Tier</th>
                <th>Tier / mo</th>
                <th>Add-ons</th>
                <th>Add-on / mo</th>
                <th>Total / mo</th>
              </tr>
            </thead>
            <tbody>
              {specialistBilling.map((row) => (
                <tr key={row.specialistId}>
                  <td>{row.specialistName}</td>
                  <td>{row.tierLabel}</td>
                  <td>{formatBillingCents(row.tierMonthlyCents, { decimals: 2 })}</td>
                  <td>
                    {row.activeAddOns.length > 0
                      ? row.activeAddOns.map((a) => a.label).join(", ")
                      : "—"}
                  </td>
                  <td>
                    {row.addOnMonthlyCents > 0
                      ? formatBillingCents(row.addOnMonthlyCents, { decimals: 0 })
                      : "—"}
                  </td>
                  <td className="admin-table__money">
                    {formatBillingCents(row.totalMonthlyCents, { decimals: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCollapsible>
    </DashboardSection>
  );
}

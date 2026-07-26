"use client";

import { useMemo } from "react";
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

export function AdminOwnerRevenuePanel({ specialists }: AdminOwnerRevenuePanelProps) {
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

  const chartSegments = [
    {
      id: "tier",
      label: "Tier subscriptions",
      value: metrics.tierRevenueCents / 100,
      color: "rgb(var(--aurora-lavender-rgb))",
    },
    {
      id: "addons",
      label: "Ad add-ons",
      value: metrics.addOnRevenueCents / 100,
      color: "rgb(var(--aurora-violet-rgb))",
    },
  ];

  const payingSpecialists = specialistBilling.filter(
    (row) => row.totalMonthlyCents > 0
  );

  return (
    <DashboardSection
      title="Revenue"
      description="Specialist tiers and paid add-ons — owner view."
    >
      <p className="admin-mock-label">
        Catalog estimate from live specialist flags (premium / featured /
        sponsored / top ranked). Stripe settlement not connected yet.
      </p>

      <div className="admin-revenue-hero">
        <div className="admin-revenue-hero__mrr">
          <span className="admin-revenue-hero__label">
            Projected monthly recurring revenue
          </span>
          <span className="admin-revenue-hero__value">
            {formatBillingCents(metrics.projectedMonthlyRecurringRevenueCents, {
              decimals: 0,
            })}
          </span>
        </div>
        <DashboardGrid className="admin-revenue-hero__grid">
          <DashboardMetricCard
            label="Tier revenue"
            value={formatBillingCents(metrics.tierRevenueCents, { decimals: 0 })}
          />
          <DashboardMetricCard
            label="Add-on revenue"
            value={formatBillingCents(metrics.addOnRevenueCents, { decimals: 0 })}
          />
          <DashboardMetricCard
            label="Total specialist revenue"
            value={formatBillingCents(metrics.totalSpecialistRevenueCents, {
              decimals: 0,
            })}
          />
          <DashboardMetricCard
            label="Boosted ads revenue"
            value={formatBillingCents(metrics.boostedAdsRevenueCents, {
              decimals: 0,
            })}
          />
        </DashboardGrid>
      </div>

      <div className="admin-charts-grid admin-charts-grid--single">
        <AdminDonutChart
          title="Tier vs add-on revenue"
          segments={chartSegments}
          centerLabel="USD / mo"
          valuePrefix="$"
        />
      </div>

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
          <p className="admin-empty">No paying specialists in mock billing data.</p>
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

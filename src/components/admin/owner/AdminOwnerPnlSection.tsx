"use client";

import { DashboardGrid, DashboardMetricCard } from "@/components/dashboard";
import {
  formatFinancialCents,
  getAdminOwnerPnlSnapshot,
} from "@/lib/admin-owner-financials-service";

export function AdminOwnerPnlSection() {
  const pnl = getAdminOwnerPnlSnapshot();

  return (
    <div className="admin-owner-block">
      <div className="admin-owner-block__head">
        <h3 className="admin-owner-block__title">P&L / expenses snapshot</h3>
        <p className="admin-mock-label">
          DEV mock financial data until Stripe/Supabase connects.
        </p>
      </div>
      <DashboardGrid className="admin-metrics-grid">
        <DashboardMetricCard
          label="Total revenue"
          value={formatFinancialCents(pnl.totalRevenueCents)}
        />
        <DashboardMetricCard
          label="Marketing spend"
          value={formatFinancialCents(pnl.marketingSpendCents)}
        />
        <DashboardMetricCard
          label="Payroll"
          value={formatFinancialCents(pnl.payrollCents)}
        />
        <DashboardMetricCard
          label="Software / tools"
          value={formatFinancialCents(pnl.softwareToolsCents)}
        />
        <DashboardMetricCard
          label="Contractor / admin"
          value={formatFinancialCents(pnl.contractorAdminCents)}
        />
        <DashboardMetricCard
          label="Net profit (est.)"
          value={formatFinancialCents(pnl.netProfitEstimateCents)}
        />
        <DashboardMetricCard
          label="Monthly expenses"
          value={formatFinancialCents(pnl.monthlyExpensesCents)}
        />
        <DashboardMetricCard
          label="Profit margin"
          value="—"
          detail={pnl.profitMarginLabel}
        />
      </DashboardGrid>
    </div>
  );
}

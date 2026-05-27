"use client";

import { useMemo } from "react";
import { DashboardGrid, DashboardMetricCard, DashboardSection } from "@/components/dashboard";
import { AdminBarChart } from "@/components/admin/charts/AdminBarChart";
import { AdminDonutChart } from "@/components/admin/charts/AdminDonutChart";
import { computeAdminOverviewCharts } from "@/lib/admin-overview-charts";
import { AdminOwnerPnlSection } from "@/components/admin/owner/AdminOwnerPnlSection";
import type { AdminPermissions } from "@/types/admin-permissions";
import type { AdminOverviewStats } from "@/types/admin";
import type { AdminClientRecord } from "@/types/admin";

interface AdminOverviewPanelProps {
  stats: AdminOverviewStats;
  clients: AdminClientRecord[];
  permissions: AdminPermissions;
  isOwnerAdmin?: boolean;
}

export function AdminOverviewPanel({
  stats,
  clients,
  permissions,
  isOwnerAdmin = false,
}: AdminOverviewPanelProps) {
  const charts = useMemo(() => computeAdminOverviewCharts(clients), [clients]);

  return (
    <DashboardSection
      title="Overview"
      description={
        permissions.canViewRevenue
          ? "Platform snapshot at a glance."
          : "Operations snapshot — revenue metrics hidden for your role."
      }
    >
      <DashboardGrid className="admin-metrics-grid">
        <DashboardMetricCard
          label="Total specialists"
          value={String(stats.totalSpecialists)}
        />
        <DashboardMetricCard
          label="Pending applications"
          value={String(stats.pendingApplications)}
        />
        <DashboardMetricCard
          label="Active specialists"
          value={String(stats.activeSpecialists)}
        />
        <DashboardMetricCard
          label="Premium specialists"
          value={String(stats.premiumSpecialists)}
        />
        <DashboardMetricCard
          label="Total clients"
          value={String(stats.totalClients)}
        />
        <DashboardMetricCard
          label="Saved activity"
          value="—"
          detail={stats.savedSpecialistActivityPlaceholder}
        />
      </DashboardGrid>

      <div className="admin-charts-grid">
        <AdminBarChart
          title="Specialists by status"
          segments={charts.specialistsByStatus}
        />
        <AdminDonutChart
          title="Premium vs free"
          segments={charts.premiumVsFree}
          centerLabel="specialists"
        />
        <AdminBarChart
          title="Applications by status"
          segments={charts.applicationsByStatus}
        />
        {permissions.canViewRevenue ? (
          <AdminDonutChart
            title="Revenue breakdown (mock)"
            segments={charts.revenueBreakdown}
            centerLabel="USD / mo"
            valuePrefix="$"
          />
        ) : null}
      </div>

      {isOwnerAdmin ? <AdminOwnerPnlSection /> : null}
    </DashboardSection>
  );
}

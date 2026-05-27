import { computeAdminOverviewStats } from "@/lib/admin-stats";
import { getAdminRevenueDashboard } from "@/lib/admin-revenue-service";
import { listSpecialistApplications } from "@/lib/specialist-application-storage";
import { listAdminSpecialists } from "@/lib/admin-specialists-service";
import type { AdminClientRecord } from "@/types/admin";

export interface AdminChartSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface AdminOverviewCharts {
  specialistsByStatus: AdminChartSegment[];
  revenueBreakdown: AdminChartSegment[];
  premiumVsFree: AdminChartSegment[];
  applicationsByStatus: AdminChartSegment[];
}

export function computeAdminOverviewCharts(
  clients: AdminClientRecord[]
): AdminOverviewCharts {
  const stats = computeAdminOverviewStats(clients);
  const revenue = getAdminRevenueDashboard();
  const specialists = listAdminSpecialists();
  const applications = listSpecialistApplications();

  const visibilityCounts = { active: 0, hidden: 0, pending: 0 };
  for (const row of specialists) {
    visibilityCounts[row.visibility] += 1;
  }

  const appCounts = { pending: 0, approved: 0, rejected: 0 };
  for (const app of applications) {
    if (app.profileStatus === "APPROVED") appCounts.approved += 1;
    else if (app.profileStatus === "REJECTED") appCounts.rejected += 1;
    else if (app.profileStatus === "PENDING_APPROVAL") appCounts.pending += 1;
  }

  const freeCount = Math.max(0, stats.totalSpecialists - stats.premiumSpecialists);

  return {
    specialistsByStatus: [
      { id: "active", label: "Active", value: visibilityCounts.active, color: "#86efac" },
      { id: "hidden", label: "Hidden", value: visibilityCounts.hidden, color: "rgba(255,255,255,0.35)" },
      { id: "pending", label: "Pending", value: visibilityCounts.pending, color: "#fcd34d" },
    ],
    revenueBreakdown: [
      {
        id: "tier",
        label: "Tier subscriptions",
        value: revenue.metrics.tierSubscriptionRevenueCents / 100,
        color: "rgb(var(--aurora-lavender-rgb))",
      },
      {
        id: "ads",
        label: "Advertising",
        value: revenue.metrics.featuredAdRevenueCents / 100,
        color: "rgb(var(--aurora-violet-rgb))",
      },
    ],
    premiumVsFree: [
      { id: "premium", label: "Premium", value: stats.premiumSpecialists, color: "rgb(var(--aurora-lavender-rgb))" },
      { id: "free", label: "Free", value: freeCount, color: "rgba(255,255,255,0.28)" },
    ],
    applicationsByStatus: [
      { id: "pending", label: "Pending", value: appCounts.pending, color: "#fcd34d" },
      { id: "approved", label: "Approved", value: appCounts.approved, color: "#86efac" },
      { id: "rejected", label: "Rejected", value: appCounts.rejected, color: "#fca5a5" },
    ],
  };
}

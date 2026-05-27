import { ADMIN_REVENUE_SEED } from "@/data/admin-revenue-seed";
import type {
  AdminRevenueDashboard,
  AdminRevenueMetrics,
  AdminRevenueSeed,
  AdPlacementRecord,
  TierSubscriptionRecord,
} from "@/types/admin-revenue";

function sumTierRevenueCents(rows: readonly TierSubscriptionRecord[]): number {
  return rows
    .filter((row) => row.status === "active")
    .reduce((sum, row) => sum + row.revenueAmountCents, 0);
}

function sumActiveAdRevenueCents(rows: readonly AdPlacementRecord[]): number {
  return rows
    .filter((row) => row.status === "active")
    .reduce((sum, row) => sum + row.priceCents, 0);
}

function computeMetrics(
  tierSubscriptions: readonly TierSubscriptionRecord[],
  adPlacements: readonly AdPlacementRecord[]
): AdminRevenueMetrics {
  const tierSubscriptionRevenueCents = sumTierRevenueCents(tierSubscriptions);
  const featuredAdRevenueCents = sumActiveAdRevenueCents(adPlacements);
  const monthlyRecurringRevenueCents =
    tierSubscriptionRevenueCents + featuredAdRevenueCents;
  const activePaidSpecialists = tierSubscriptions.filter(
    (row) => row.status === "active"
  ).length;
  const cancelledCount = tierSubscriptions.filter(
    (row) => row.status === "cancelled"
  ).length;

  return {
    monthlyRecurringRevenueCents,
    activePaidSpecialists,
    featuredAdRevenueCents,
    tierSubscriptionRevenueCents,
    totalProjectedMonthlyRevenueCents: monthlyRecurringRevenueCents,
    churnCancelledSpecialistsLabel:
      cancelledCount > 0
        ? `${cancelledCount} cancelled this period — connect Stripe webhooks for live churn`
        : "Churn tracking — connect Stripe cancellation events",
  };
}

function buildDashboardFromSeed(seed: AdminRevenueSeed): AdminRevenueDashboard {
  const tierSubscriptions = [...seed.tierSubscriptions];
  const adPlacements = [...seed.adPlacements];
  const metrics = computeMetrics(tierSubscriptions, adPlacements);

  return {
    metrics,
    tierSubscriptions,
    adPlacements,
    summary: {
      thisMonthCents: seed.summary.thisMonthCents,
      lastMonthCents: seed.summary.lastMonthCents,
      yearToDateLabel: seed.summary.yearToDateLabel,
      projectedAnnualRunRateCents: metrics.totalProjectedMonthlyRevenueCents * 12,
    },
    dataSource: "mock",
  };
}

/** Stable snapshot — safe for useMemo / SSR */
const REVENUE_DASHBOARD_SNAPSHOT = buildDashboardFromSeed(ADMIN_REVENUE_SEED);

/**
 * Admin revenue dashboard payload.
 * Future: swap implementation to fetch from Supabase + Stripe sync tables.
 */
export function getAdminRevenueDashboard(): AdminRevenueDashboard {
  return REVENUE_DASHBOARD_SNAPSHOT;
}

export function formatRevenueCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function adPlacementTypeLabel(type: AdPlacementRecord["adType"]): string {
  const labels: Record<AdPlacementRecord["adType"], string> = {
    featured_placement: "Featured placement",
    top_ranking_boost: "Top ranking boost",
    homepage_spotlight: "Homepage spotlight",
    category_spotlight: "Category spotlight",
  };
  return labels[type];
}

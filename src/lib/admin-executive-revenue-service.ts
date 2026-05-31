import { getAdminOwnerRevenueDashboard } from "@/lib/admin-specialist-billing-service";
import { getAdminRevenueDashboard } from "@/lib/admin-revenue-service";
import type { AdminExecutiveRevenueSnapshot } from "@/types/admin-executive-snapshot";

export interface ExecutiveRevenueSnapshotInput {
  readonly specialistRows?: readonly {
    id: string;
    name: string;
    isPremium: boolean;
    featured: boolean;
  }[];
}

function formatPeriodLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatMonthOverMonth(
  thisMonthCents: number,
  lastMonthCents: number
): { percent: number | null; label: string } {
  if (lastMonthCents <= 0) {
    return { percent: null, label: "—" };
  }
  const percent = ((thisMonthCents - lastMonthCents) / lastMonthCents) * 100;
  const sign = percent >= 0 ? "+" : "";
  return {
    percent,
    label: `${sign}${percent.toFixed(1)}%`,
  };
}

/**
 * Executive revenue snapshot for the admin control header.
 * Today: mock seed via getAdminRevenueDashboard (+ specialist billing counts).
 * Future: Stripe MRR + ad network / placement revenue APIs.
 */
export function getAdminExecutiveRevenueSnapshot(
  input: ExecutiveRevenueSnapshotInput = {}
): AdminExecutiveRevenueSnapshot {
  const revenue = getAdminRevenueDashboard();
  const { metrics, summary, dataSource } = revenue;

  const subscriberRevenueCents = metrics.tierSubscriptionRevenueCents;
  const adRevenueCents = metrics.featuredAdRevenueCents;
  const netSalesCents =
    metrics.monthlyRecurringRevenueCents ||
    subscriberRevenueCents + adRevenueCents;

  let paidSubscriberCount = metrics.activePaidSpecialists;
  if (input.specialistRows?.length) {
    const billing = getAdminOwnerRevenueDashboard(input.specialistRows);
    paidSubscriberCount = billing.metrics.payingSpecialistsCount;
  }

  const mom = formatMonthOverMonth(
    summary.thisMonthCents,
    summary.lastMonthCents
  );

  return {
    periodLabel: formatPeriodLabel(new Date()),
    netSalesCents,
    subscriberRevenueCents,
    paidSubscriberCount,
    adRevenueCents,
    monthOverMonthPercent: mom.percent,
    monthOverMonthLabel: mom.label,
    dataSource,
  };
}

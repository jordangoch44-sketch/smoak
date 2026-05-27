/**
 * Admin revenue domain types — Stripe / Supabase ready.
 * Amounts are USD cents (Stripe minor units).
 */

export type TierSubscriptionStatus = "active" | "trial" | "cancelled";

export type AdPlacementType =
  | "featured_placement"
  | "top_ranking_boost"
  | "homepage_spotlight"
  | "category_spotlight";

export type AdPlacementStatus = "active" | "scheduled" | "expired";

/** Future: maps to stripe_subscription_id */
export interface TierSubscriptionRecord {
  id: string;
  specialistId: string;
  specialistName: string;
  tierName: string;
  monthlyPriceCents: number;
  status: TierSubscriptionStatus;
  renewalDate: string;
  /** Monthly recognized revenue for this row */
  revenueAmountCents: number;
  stripeSubscriptionId?: string | null;
}

/** Future: maps to stripe_payment_intent / invoice line items */
export interface AdPlacementRecord {
  id: string;
  specialistId: string;
  specialistName: string;
  adType: AdPlacementType;
  priceCents: number;
  startDate: string;
  endDate: string;
  status: AdPlacementStatus;
  stripeInvoiceId?: string | null;
}

export interface AdminRevenueSummary {
  thisMonthCents: number;
  lastMonthCents: number;
  /** Placeholder until billing history is wired */
  yearToDateLabel: string;
  projectedAnnualRunRateCents: number;
}

export interface AdminRevenueMetrics {
  monthlyRecurringRevenueCents: number;
  activePaidSpecialists: number;
  featuredAdRevenueCents: number;
  tierSubscriptionRevenueCents: number;
  totalProjectedMonthlyRevenueCents: number;
  churnCancelledSpecialistsLabel: string;
}

export interface AdminRevenueDashboard {
  metrics: AdminRevenueMetrics;
  tierSubscriptions: readonly TierSubscriptionRecord[];
  adPlacements: readonly AdPlacementRecord[];
  summary: AdminRevenueSummary;
  /** DEV — indicates mock seed vs live billing API */
  dataSource: "mock" | "live";
}

/** Raw seed shape — replace with DB rows later */
export interface AdminRevenueSeed {
  tierSubscriptions: TierSubscriptionRecord[];
  adPlacements: AdPlacementRecord[];
  summary: Pick<AdminRevenueSummary, "thisMonthCents" | "lastMonthCents" | "yearToDateLabel">;
}

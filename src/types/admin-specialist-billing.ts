/**
 * Specialist subscription + add-on billing — maps to Stripe products later.
 * Amounts in USD cents.
 */

export type SpecialistBillingTier = "free" | "premium" | "platinum";

export type SpecialistAdAddOnId =
  | "boosted_profile"
  | "category_spotlight"
  | "homepage_spotlight"
  | "top_ranking_boost";

export interface SpecialistAdAddOn {
  id: SpecialistAdAddOnId;
  label: string;
  monthlyCents: number;
}

export interface SpecialistBillingRecord {
  specialistId: string;
  specialistName: string;
  tier: SpecialistBillingTier;
  tierLabel: string;
  tierMonthlyCents: number;
  activeAddOns: readonly SpecialistAdAddOn[];
  addOnMonthlyCents: number;
  totalMonthlyCents: number;
}

/** Owner revenue rollup from Stripe-synced specialist billing */
export interface AdminOwnerRevenueMetrics {
  tierRevenueCents: number;
  addOnRevenueCents: number;
  totalSpecialistRevenueCents: number;
  boostedAdsRevenueCents: number;
  projectedMonthlyRecurringRevenueCents: number;
  payingSpecialistsCount: number;
}

export type AdminOwnerRevenueDataSource =
  | "catalog-estimate"
  | "stripe"
  | "billing_table";

export interface AdminOwnerRevenueDashboard {
  metrics: AdminOwnerRevenueMetrics;
  specialistBilling: readonly SpecialistBillingRecord[];
  dataSource: AdminOwnerRevenueDataSource;
}

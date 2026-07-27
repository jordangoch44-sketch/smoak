import {
  SPECIALIST_AD_ADDON_CATALOG,
  SPECIALIST_TIER_CATALOG,
} from "@/data/admin-specialist-billing-catalog";
import type {
  AdminOwnerRevenueDashboard,
  AdminOwnerRevenueMetrics,
  SpecialistAdAddOn,
  SpecialistAdAddOnId,
  SpecialistBillingRecord,
  SpecialistBillingTier,
} from "@/types/admin-specialist-billing";

function resolveTier(
  isPremium: boolean,
  featured: boolean
): SpecialistBillingTier {
  if (isPremium && featured) return "platinum";
  if (isPremium) return "premium";
  return "free";
}

function resolveAddOnIdsFromFlags(input: {
  featured: boolean;
  sponsored?: boolean;
  topRanked?: boolean;
}): SpecialistAdAddOnId[] {
  const ids: SpecialistAdAddOnId[] = [];
  if (input.featured) ids.push("homepage_spotlight");
  if (input.sponsored) ids.push("boosted_profile");
  if (input.topRanked) ids.push("top_ranking_boost");
  return ids;
}

function buildAddOns(ids: SpecialistAdAddOnId[]): SpecialistAdAddOn[] {
  return ids.map((id) => ({
    id,
    label: SPECIALIST_AD_ADDON_CATALOG[id].label,
    monthlyCents: SPECIALIST_AD_ADDON_CATALOG[id].monthlyCents,
  }));
}

export function buildSpecialistBillingRecord(input: {
  specialistId: string;
  specialistName: string;
  isPremium: boolean;
  featured: boolean;
  sponsored?: boolean;
  topRanked?: boolean;
}): SpecialistBillingRecord {
  const tier = resolveTier(input.isPremium, input.featured);
  const tierMeta = SPECIALIST_TIER_CATALOG[tier];
  const addOnIds = resolveAddOnIdsFromFlags(input);
  const activeAddOns = buildAddOns(addOnIds);
  const addOnMonthlyCents = activeAddOns.reduce(
    (sum, addOn) => sum + addOn.monthlyCents,
    0
  );

  return {
    specialistId: input.specialistId,
    specialistName: input.specialistName,
    tier,
    tierLabel: tierMeta.label,
    tierMonthlyCents: tierMeta.monthlyCents,
    activeAddOns,
    addOnMonthlyCents,
    totalMonthlyCents: tierMeta.monthlyCents + addOnMonthlyCents,
  };
}

export function listSpecialistBillingFromRows(
  rows: readonly {
    id: string;
    name: string;
    isPremium: boolean;
    featured: boolean;
    sponsored?: boolean;
    topRanked?: boolean;
  }[]
): SpecialistBillingRecord[] {
  return rows
    .map((row) =>
      buildSpecialistBillingRecord({
        specialistId: row.id,
        specialistName: row.name,
        isPremium: row.isPremium,
        featured: row.featured,
        sponsored: row.sponsored,
        topRanked: row.topRanked,
      })
    )
    .sort((a, b) => b.totalMonthlyCents - a.totalMonthlyCents);
}

function computeOwnerMetrics(
  records: readonly SpecialistBillingRecord[]
): AdminOwnerRevenueMetrics {
  const tierRevenueCents = records.reduce(
    (sum, row) => sum + row.tierMonthlyCents,
    0
  );
  const addOnRevenueCents = records.reduce(
    (sum, row) => sum + row.addOnMonthlyCents,
    0
  );
  const totalSpecialistRevenueCents = tierRevenueCents + addOnRevenueCents;

  return {
    tierRevenueCents,
    addOnRevenueCents,
    totalSpecialistRevenueCents,
    boostedAdsRevenueCents: addOnRevenueCents,
    projectedMonthlyRecurringRevenueCents: totalSpecialistRevenueCents,
    payingSpecialistsCount: records.filter((row) => row.totalMonthlyCents > 0)
      .length,
  };
}

const OWNER_REVENUE_CACHE = new Map<string, AdminOwnerRevenueDashboard>();

export function getAdminOwnerRevenueDashboard(
  specialistRows: readonly {
    id: string;
    name: string;
    isPremium: boolean;
    featured: boolean;
    sponsored?: boolean;
    topRanked?: boolean;
  }[]
): AdminOwnerRevenueDashboard {
  const key = specialistRows
    .map(
      (r) =>
        `${r.id}:${r.isPremium}:${r.featured}:${Boolean(r.sponsored)}:${Boolean(r.topRanked)}`
    )
    .join("|");
  const cached = OWNER_REVENUE_CACHE.get(key);
  if (cached) return cached;

  const specialistBilling = listSpecialistBillingFromRows(specialistRows);
  const dashboard: AdminOwnerRevenueDashboard = {
    metrics: computeOwnerMetrics(specialistBilling),
    specialistBilling,
    /* Catalog estimate from admin flags — not Stripe settlement */
    dataSource: "catalog-estimate",
  };
  OWNER_REVENUE_CACHE.set(key, dashboard);
  return dashboard;
}

export function formatBillingCents(
  cents: number,
  options?: { decimals?: number }
): string {
  const decimals = options?.decimals ?? (cents % 100 === 0 ? 0 : 2);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(cents / 100);
}

export function formatTierPrice(tierMonthlyCents: number): string {
  if (tierMonthlyCents === 0) return "$0/month";
  return `${formatBillingCents(tierMonthlyCents, { decimals: 2 })}/month`;
}

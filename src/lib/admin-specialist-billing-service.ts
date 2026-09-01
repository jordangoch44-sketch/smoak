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

function asBillingTier(plan: string | null | undefined): SpecialistBillingTier {
  if (plan === "premium" || plan === "platinum") return plan;
  return "free";
}

function asAddOnId(value: string): SpecialistAdAddOnId | null {
  if (
    value === "boosted_profile" ||
    value === "category_spotlight" ||
    value === "homepage_spotlight" ||
    value === "top_ranking_boost"
  ) {
    return value;
  }
  return null;
}

/** Stripe-synced specialist_billing row → roster amounts (not profile flags). */
export function buildSpecialistBillingFromLiveRow(input: {
  specialistId: string;
  specialistName: string;
  plan?: string | null;
  status?: string | null;
  activeAddOns?: readonly string[] | null;
  membershipCents?: number;
  addonCents?: number;
}): SpecialistBillingRecord {
  const paying =
    input.status === "active" || input.status === "trialing";
  const tier = paying ? asBillingTier(input.plan) : "free";
  const tierMeta = SPECIALIST_TIER_CATALOG[tier];
  const addOnIds = paying
    ? (input.activeAddOns ?? [])
        .map((id) => asAddOnId(String(id)))
        .filter((id): id is SpecialistAdAddOnId => Boolean(id))
    : [];
  const activeAddOns = buildAddOns(addOnIds);
  const catalogAddOnCents = activeAddOns.reduce(
    (sum, addOn) => sum + addOn.monthlyCents,
    0
  );
  const catalogTierCents = paying ? tierMeta.monthlyCents : 0;
  const tierMonthlyCents =
    typeof input.membershipCents === "number"
      ? input.membershipCents
      : catalogTierCents;
  const addOnMonthlyCents =
    typeof input.addonCents === "number"
      ? input.addonCents
      : catalogAddOnCents;
  const pricedAddOns =
    typeof input.addonCents === "number" && activeAddOns.length === 1
      ? [{ ...activeAddOns[0], monthlyCents: addOnMonthlyCents }]
      : activeAddOns;

  return {
    specialistId: input.specialistId,
    specialistName: input.specialistName,
    tier,
    tierLabel: paying ? tierMeta.label : SPECIALIST_TIER_CATALOG.free.label,
    tierMonthlyCents,
    activeAddOns: pricedAddOns,
    addOnMonthlyCents,
    totalMonthlyCents: tierMonthlyCents + addOnMonthlyCents,
  };
}

export function liveBillingBySpecialistId(
  rows: readonly {
    specialistProfileId: string | null;
    specialistName: string;
    status: string;
    plan?: string | null;
    activeAddOns?: readonly string[] | null;
    membershipCents?: number;
    addonCents?: number;
  }[]
): Map<string, SpecialistBillingRecord> {
  const map = new Map<string, SpecialistBillingRecord>();
  for (const row of rows) {
    const id = row.specialistProfileId?.trim();
    if (!id) continue;
    map.set(
      id,
      buildSpecialistBillingFromLiveRow({
        specialistId: id,
        specialistName: row.specialistName,
        plan: row.plan,
        status: row.status,
        activeAddOns: row.activeAddOns,
        membershipCents: row.membershipCents,
        addonCents: row.addonCents,
      })
    );
  }
  return map;
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

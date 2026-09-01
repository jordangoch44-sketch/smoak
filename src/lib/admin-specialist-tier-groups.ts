import { SPECIALIST_TIER_CATALOG } from "@/data/admin-specialist-billing-catalog";
import type { AdminSpecialistRow } from "@/lib/admin-specialists-service";
import type { SpecialistBillingRecord } from "@/types/admin-specialist-billing";

/** Owner Specialists subcategory — maps to Stripe tier + add-on products later */
export type SpecialistTierCategory =
  | "free"
  | "pro_trial"
  | "premium"
  | "platinum"
  | "addons";

export interface SpecialistTierCategoryMeta {
  id: SpecialistTierCategory;
  label: string;
  tierLabel: string;
  priceLabel: string;
  description: string;
}

export const SPECIALIST_TIER_CATEGORIES: readonly SpecialistTierCategoryMeta[] = [
  {
    id: "free",
    label: "Free",
    tierLabel: "Free",
    priceLabel: "$0/month",
    description: "Free tier specialists",
  },
  {
    id: "pro_trial",
    label: "Pro trial",
    tierLabel: "Complimentary",
    priceLabel: "30 days free",
    description: "Specialists on the complimentary 30-day Pro trial",
  },
  {
    id: "premium",
    label: "Pro",
    tierLabel: "Paid Pro",
    priceLabel: "$9.99/month",
    description: "Paid Pro specialists",
  },
  {
    id: "platinum",
    label: "Platinum",
    tierLabel: "Platinum",
    priceLabel: "$19.99/month",
    description: "Platinum tier specialists",
  },
  {
    id: "addons",
    label: "Add-ons",
    tierLabel: "Paid add-ons",
    priceLabel: "Boost · Spotlight · Ranking",
    description: "Specialists with active paid add-ons",
  },
] as const;

function isActiveProTrial(row: AdminSpecialistRow): boolean {
  return Boolean(row.premiumTrialActive) && !row.isPaidPro;
}

export function specialistMatchesTierCategory(
  row: AdminSpecialistRow,
  billing: SpecialistBillingRecord | undefined,
  category: SpecialistTierCategory
): boolean {
  if (category === "addons") {
    return Boolean(
      billing && billing.activeAddOns.length > 0 && billing.addOnMonthlyCents > 0
    );
  }

  if (isActiveProTrial(row)) {
    return category === "pro_trial";
  }

  if (category === "pro_trial") return false;
  if (!billing) return category === "free";
  return billing.tier === category;
}

export function filterSpecialistsByTierCategory(
  specialists: readonly AdminSpecialistRow[],
  billingById: ReadonlyMap<string, SpecialistBillingRecord>,
  category: SpecialistTierCategory
): AdminSpecialistRow[] {
  return specialists.filter((row) =>
    specialistMatchesTierCategory(row, billingById.get(row.id), category)
  );
}

export function countSpecialistsByTierCategory(
  specialists: readonly AdminSpecialistRow[],
  billingById: ReadonlyMap<string, SpecialistBillingRecord>
): Record<SpecialistTierCategory, number> {
  return {
    free: filterSpecialistsByTierCategory(specialists, billingById, "free")
      .length,
    pro_trial: filterSpecialistsByTierCategory(
      specialists,
      billingById,
      "pro_trial"
    ).length,
    premium: filterSpecialistsByTierCategory(
      specialists,
      billingById,
      "premium"
    ).length,
    platinum: filterSpecialistsByTierCategory(
      specialists,
      billingById,
      "platinum"
    ).length,
    addons: filterSpecialistsByTierCategory(specialists, billingById, "addons")
      .length,
  };
}

/** Display price for tier cards (catalog-backed, Stripe-ready) */
export function tierCategoryPriceLabel(category: SpecialistTierCategory): string {
  if (category === "addons") {
    return SPECIALIST_TIER_CATEGORIES.find((c) => c.id === "addons")!.priceLabel;
  }
  if (category === "pro_trial") {
    return SPECIALIST_TIER_CATEGORIES.find((c) => c.id === "pro_trial")!
      .priceLabel;
  }
  const cents = SPECIALIST_TIER_CATALOG[category].monthlyCents;
  if (cents === 0) return "$0/month";
  return `$${(cents / 100).toFixed(2)}/month`;
}

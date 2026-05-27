import { SPECIALIST_TIER_CATALOG } from "@/data/admin-specialist-billing-catalog";
import type { AdminSpecialistRow } from "@/lib/admin-specialists-service";
import type { SpecialistBillingRecord } from "@/types/admin-specialist-billing";

/** Owner Specialists subcategory — maps to Stripe tier + add-on products later */
export type SpecialistTierCategory = "free" | "premium" | "platinum" | "addons";

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
    id: "premium",
    label: "Premium",
    tierLabel: "Premium",
    priceLabel: "$9.99/month",
    description: "Premium tier specialists",
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

export function specialistMatchesTierCategory(
  billing: SpecialistBillingRecord | undefined,
  category: SpecialistTierCategory
): boolean {
  if (!billing) return category === "free";
  if (category === "addons") {
    return billing.activeAddOns.length > 0 && billing.addOnMonthlyCents > 0;
  }
  return billing.tier === category;
}

export function filterSpecialistsByTierCategory(
  specialists: readonly AdminSpecialistRow[],
  billingById: ReadonlyMap<string, SpecialistBillingRecord>,
  category: SpecialistTierCategory
): AdminSpecialistRow[] {
  return specialists.filter((row) =>
    specialistMatchesTierCategory(billingById.get(row.id), category)
  );
}

export function countSpecialistsByTierCategory(
  specialists: readonly AdminSpecialistRow[],
  billingById: ReadonlyMap<string, SpecialistBillingRecord>
): Record<SpecialistTierCategory, number> {
  return {
    free: filterSpecialistsByTierCategory(specialists, billingById, "free").length,
    premium: filterSpecialistsByTierCategory(specialists, billingById, "premium")
      .length,
    platinum: filterSpecialistsByTierCategory(specialists, billingById, "platinum")
      .length,
    addons: filterSpecialistsByTierCategory(specialists, billingById, "addons")
      .length,
  };
}

/** Display price for tier cards (catalog-backed, Stripe-ready) */
export function tierCategoryPriceLabel(category: SpecialistTierCategory): string {
  if (category === "addons") {
    return SPECIALIST_TIER_CATEGORIES.find((c) => c.id === "addons")!.priceLabel;
  }
  const cents = SPECIALIST_TIER_CATALOG[category].monthlyCents;
  if (cents === 0) return "$0/month";
  return `$${(cents / 100).toFixed(2)}/month`;
}

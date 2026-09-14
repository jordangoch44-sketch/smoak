import { SPECIALIST_TIER_CATALOG } from "@/data/admin-specialist-billing-catalog";
import type { AdminSpecialistRow } from "@/lib/admin-specialists-service";
import type { SpecialistBillingRecord } from "@/types/admin-specialist-billing";

/** Owner Specialists subcategory — maps to Stripe tier + add-on products later */
export type SpecialistTierCategory =
  | "free"
  | "trial"
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
    id: "trial",
    label: "Pro Trial",
    tierLabel: "Pro Trial",
    priceLabel: "Complimentary",
    description: "Specialists on the complimentary Pro trial",
  },
  {
    id: "premium",
    label: "Pro",
    tierLabel: "Pro",
    priceLabel: "$19.99/month",
    description: "Pro tier specialists",
  },
  {
    id: "platinum",
    label: "PRO+",
    tierLabel: "PRO+",
    priceLabel: "$29.99/month",
    description: "PRO+ specialists",
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
  row: AdminSpecialistRow,
  billing: SpecialistBillingRecord | undefined,
  category: SpecialistTierCategory
): boolean {
  const onTrial = Boolean(row.premiumTrialActive || billing?.isTrialing);
  if (category === "trial") return onTrial;
  if (category === "addons") {
    return Boolean(
      billing && billing.activeAddOns.length > 0 && billing.addOnMonthlyCents > 0
    );
  }
  if (!billing) return category === "free" && !onTrial;
  if (category === "premium") return billing.tier === "premium" && !onTrial;
  if (category === "free") return billing.tier === "free" && !onTrial;
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
    trial: filterSpecialistsByTierCategory(specialists, billingById, "trial")
      .length,
    premium: filterSpecialistsByTierCategory(specialists, billingById, "premium")
      .length,
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
  if (category === "addons" || category === "trial") {
    return SPECIALIST_TIER_CATEGORIES.find((c) => c.id === category)!.priceLabel;
  }
  const cents = SPECIALIST_TIER_CATALOG[category].monthlyCents;
  if (cents === 0) return "$0/month";
  return `$${(cents / 100).toFixed(2)}/month`;
}

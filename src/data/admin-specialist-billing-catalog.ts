import type {
  SpecialistAdAddOnId,
  SpecialistBillingTier,
} from "@/types/admin-specialist-billing";

/** Marketplace tier list prices (monthly, USD cents) */
export const SPECIALIST_TIER_CATALOG: Record<
  SpecialistBillingTier,
  { label: string; monthlyCents: number }
> = {
  free: { label: "Free", monthlyCents: 0 },
  premium: { label: "Premium", monthlyCents: 999 },
  platinum: { label: "Platinum", monthlyCents: 1999 },
};

/** Paid ad add-ons (monthly, USD cents) */
export const SPECIALIST_AD_ADDON_CATALOG: Record<
  SpecialistAdAddOnId,
  { label: string; monthlyCents: number }
> = {
  boosted_profile: { label: "Boosted profile", monthlyCents: 4900 },
  category_spotlight: { label: "Category spotlight", monthlyCents: 9900 },
  homepage_spotlight: { label: "Homepage spotlight", monthlyCents: 19900 },
  top_ranking_boost: { label: "Top ranking boost", monthlyCents: 14900 },
};

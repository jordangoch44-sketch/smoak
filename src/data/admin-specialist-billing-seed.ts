import type {
  SpecialistAdAddOnId,
  SpecialistBillingTier,
} from "@/types/admin-specialist-billing";

/** Per-specialist billing overrides — replace with Supabase `specialist_subscriptions` */
export interface SpecialistBillingSeedEntry {
  tier: SpecialistBillingTier;
  addOnIds: SpecialistAdAddOnId[];
}

export const ADMIN_SPECIALIST_BILLING_SEED: Record<
  string,
  SpecialistBillingSeedEntry
> = {
  "anthony-brooks": {
    tier: "platinum",
    addOnIds: ["boosted_profile", "homepage_spotlight"],
  },
  "marcus-chen": {
    tier: "premium",
    addOnIds: ["top_ranking_boost"],
  },
  "elena-vasquez": {
    tier: "platinum",
    addOnIds: ["category_spotlight", "boosted_profile"],
  },
  "david-okonkwo": { tier: "free", addOnIds: [] },
  "sophia-laurent": {
    tier: "premium",
    addOnIds: ["boosted_profile"],
  },
  "james-morrison": { tier: "free", addOnIds: [] },
  "elena-ramirez": {
    tier: "premium",
    addOnIds: ["category_spotlight"],
  },
  "marcus-lee": { tier: "free", addOnIds: [] },
  "sophia-bennett": {
    tier: "platinum",
    addOnIds: ["top_ranking_boost"],
  },
};

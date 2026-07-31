/**
 * SMOAC specialist Stripe products — membership vs paid placement add-ons.
 *
 * Rules:
 * - Premium / Platinum set membership only (is_premium). Platinum also includes featured.
 * - Pro membership never grants sponsored placement by itself.
 * - Add-ons set placement flags independently and do not require Pro.
 */

import {
  SPECIALIST_AD_ADDON_CATALOG,
  SPECIALIST_TIER_CATALOG,
} from "@/data/admin-specialist-billing-catalog";
import type { SpecialistAdAddOnId } from "@/types/admin-specialist-billing";

export type SmoacMembershipProduct = "premium" | "platinum";
export type SmoacAddonProduct = SpecialistAdAddOnId;
export type SmoacStripeProductKey = SmoacMembershipProduct | SmoacAddonProduct;

export const SMOAC_MEMBERSHIP_PRODUCTS: readonly SmoacMembershipProduct[] = [
  "premium",
  "platinum",
] as const;

export const SMOAC_ADDON_PRODUCTS: readonly SmoacAddonProduct[] = [
  "boosted_profile",
  "category_spotlight",
  "homepage_spotlight",
  "top_ranking_boost",
] as const;

export const SMOAC_STRIPE_PRODUCTS: readonly SmoacStripeProductKey[] = [
  ...SMOAC_MEMBERSHIP_PRODUCTS,
  ...SMOAC_ADDON_PRODUCTS,
];

const MEMBERSHIP_SET = new Set<string>(SMOAC_MEMBERSHIP_PRODUCTS);
const ADDON_SET = new Set<string>(SMOAC_ADDON_PRODUCTS);

export function isSmoacStripeProductKey(
  value: string | null | undefined
): value is SmoacStripeProductKey {
  return Boolean(
    value && (MEMBERSHIP_SET.has(value) || ADDON_SET.has(value))
  );
}

export function isMembershipProduct(
  key: SmoacStripeProductKey
): key is SmoacMembershipProduct {
  return MEMBERSHIP_SET.has(key);
}

export function isAddonProduct(
  key: SmoacStripeProductKey
): key is SmoacAddonProduct {
  return ADDON_SET.has(key);
}

/** Env var → Stripe Price ID for each catalog product */
export function getStripePriceIdForProduct(
  key: SmoacStripeProductKey
): string | null {
  const envKey = stripePriceEnvName(key);
  return process.env[envKey]?.trim() || null;
}

export function stripePriceEnvName(key: SmoacStripeProductKey): string {
  switch (key) {
    case "premium":
      return "STRIPE_PRICE_PREMIUM";
    case "platinum":
      return "STRIPE_PRICE_PLATINUM";
    case "boosted_profile":
      return "STRIPE_PRICE_BOOSTED_PROFILE";
    case "category_spotlight":
      return "STRIPE_PRICE_CATEGORY_SPOTLIGHT";
    case "homepage_spotlight":
      return "STRIPE_PRICE_HOMEPAGE_SPOTLIGHT";
    case "top_ranking_boost":
      return "STRIPE_PRICE_TOP_RANKING_BOOST";
  }
}

export function listPriceCents(key: SmoacStripeProductKey): number {
  if (isMembershipProduct(key)) {
    return SPECIALIST_TIER_CATALOG[key].monthlyCents;
  }
  return SPECIALIST_AD_ADDON_CATALOG[key].monthlyCents;
}

/** Display label for catalog / checkout list prices */
export function formatListPriceLabel(cents: number): string {
  const dollars = cents / 100;
  const fixed = dollars.toFixed(cents % 100 === 0 ? 0 : 2);
  return `$${fixed}/mo`;
}

export function productLabel(key: SmoacStripeProductKey): string {
  if (isMembershipProduct(key)) {
    return key === "premium" ? "SMOAC Pro" : SPECIALIST_TIER_CATALOG[key].label;
  }
  return SPECIALIST_AD_ADDON_CATALOG[key].label;
}

export function productDescription(key: SmoacStripeProductKey): string {
  switch (key) {
    case "premium":
      return "Full analytics, ranking intelligence, and growth insights.";
    case "platinum":
      return "Pro analytics plus Featured homepage spotlight placement.";
    case "boosted_profile":
      return "Homepage Sponsored rail near clients in your area.";
    case "category_spotlight":
      return "Pinned first in Explore when clients browse your specialty.";
    case "homepage_spotlight":
      return "Featured homepage spotlight rail across SMOAC.";
    case "top_ranking_boost":
      return "Labeled ranking boost on homepage Top Rated and City Rankings.";
  }
}

/** Resolve product key from Stripe price/product metadata or known price IDs */
export function resolveProductKeyFromStripe(input: {
  priceId?: string | null;
  metadata?: Record<string, string> | null;
}): SmoacStripeProductKey | null {
  const fromMeta =
    input.metadata?.smoac_product ||
    input.metadata?.smoac_plan ||
    input.metadata?.smoac_addon ||
    null;
  if (isSmoacStripeProductKey(fromMeta)) return fromMeta;

  if (input.priceId) {
    for (const key of SMOAC_STRIPE_PRODUCTS) {
      if (getStripePriceIdForProduct(key) === input.priceId) return key;
    }
  }
  return null;
}

export interface StripeEntitlements {
  plan: "free" | "premium" | "platinum";
  activeAddons: SmoacAddonProduct[];
  isPremium: boolean;
  featured: boolean;
  sponsored: boolean;
  topRanked: boolean;
  categorySpotlight: boolean;
}

/** Map paid products → profile flags (Pro never implies sponsored). */
export function entitlementsFromProducts(
  products: readonly SmoacStripeProductKey[]
): StripeEntitlements {
  const set = new Set(products);
  const hasPremium = set.has("premium");
  const hasPlatinum = set.has("platinum");
  const activeAddons = SMOAC_ADDON_PRODUCTS.filter((id) => set.has(id));

  const plan: StripeEntitlements["plan"] = hasPlatinum
    ? "platinum"
    : hasPremium
      ? "premium"
      : "free";

  const featured =
    hasPlatinum || set.has("homepage_spotlight");
  const sponsored = set.has("boosted_profile");
  const topRanked = set.has("top_ranking_boost");
  const categorySpotlight = set.has("category_spotlight");

  return {
    plan,
    activeAddons,
    isPremium: plan !== "free",
    featured,
    sponsored,
    topRanked,
    categorySpotlight,
  };
}

export const BOOST_PRODUCT_OPTIONS: readonly {
  key: SmoacAddonProduct;
  label: string;
  description: string;
  priceLabel: string;
}[] = SMOAC_ADDON_PRODUCTS.map((key) => ({
  key,
  label: productLabel(key),
  description: productDescription(key),
  priceLabel: formatListPriceLabel(listPriceCents(key)),
}));

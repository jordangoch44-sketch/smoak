/**
 * Boost campaigns — duration + daily budget (Instagram-style), not monthly SKUs.
 * Presentation + price math only. Stripe charge lives in boost-campaign-intent.
 */

import {
  discountedBoostCents,
  PRO_PLUS_BOOST_PERCENT_OFF,
} from "@/lib/stripe/pro-plus-boost";
import type { SmoacAddonProduct } from "@/lib/stripe/products";

export const BOOST_CAMPAIGN_MIN_DAYS = 1;
export const BOOST_CAMPAIGN_MAX_DAYS = 30;
export const BOOST_CAMPAIGN_DEFAULT_DAYS = 7;

export const BOOST_CAMPAIGN_MIN_DAILY_CENTS = 500;
export const BOOST_CAMPAIGN_MAX_DAILY_CENTS = 5000;
export const BOOST_CAMPAIGN_DAILY_STEP_CENTS = 100;
export const BOOST_CAMPAIGN_DEFAULT_DAILY_CENTS = 1000;

export type BoostCampaignProduct = Exclude<
  SmoacAddonProduct,
  "top_ranking_boost"
>;

export interface BoostCampaignPlacement {
  key: BoostCampaignProduct;
  /** Short label on the picture */
  chip: string;
  /** Caption under the picture */
  caption: string;
}

export const BOOST_CAMPAIGN_PLACEMENTS: readonly BoostCampaignPlacement[] = [
  {
    key: "boosted_profile",
    chip: "Sponsored",
    caption: "Marketplace",
  },
  {
    key: "category_spotlight",
    chip: "Spotlight",
    caption: "Search",
  },
  {
    key: "homepage_spotlight",
    chip: "Featured",
    caption: "Homepage",
  },
];

export function isBoostCampaignProduct(
  value: string | null | undefined
): value is BoostCampaignProduct {
  return BOOST_CAMPAIGN_PLACEMENTS.some((item) => item.key === value);
}

export function getBoostCampaignPlacement(
  key: BoostCampaignProduct
): BoostCampaignPlacement {
  const found = BOOST_CAMPAIGN_PLACEMENTS.find((item) => item.key === key);
  if (!found) {
    throw new Error(`Unknown boost placement: ${key}`);
  }
  return found;
}

export function clampBoostDays(days: number): number {
  if (!Number.isFinite(days)) return BOOST_CAMPAIGN_DEFAULT_DAYS;
  return Math.min(
    BOOST_CAMPAIGN_MAX_DAYS,
    Math.max(BOOST_CAMPAIGN_MIN_DAYS, Math.round(days))
  );
}

export function clampBoostDailyCents(cents: number): number {
  if (!Number.isFinite(cents)) return BOOST_CAMPAIGN_DEFAULT_DAILY_CENTS;
  const stepped =
    Math.round(cents / BOOST_CAMPAIGN_DAILY_STEP_CENTS) *
    BOOST_CAMPAIGN_DAILY_STEP_CENTS;
  return Math.min(
    BOOST_CAMPAIGN_MAX_DAILY_CENTS,
    Math.max(BOOST_CAMPAIGN_MIN_DAILY_CENTS, stepped)
  );
}

export function boostCampaignListCents(dailyCents: number, days: number): number {
  return clampBoostDailyCents(dailyCents) * clampBoostDays(days);
}

export function boostCampaignPayCents(
  dailyCents: number,
  days: number,
  proPlus: boolean
): number {
  const list = boostCampaignListCents(dailyCents, days);
  return proPlus ? discountedBoostCents(list) : list;
}

export function formatBoostUsd(cents: number): string {
  const dollars = cents / 100;
  if (cents % 100 === 0) return `$${dollars}`;
  return `$${dollars.toFixed(2)}`;
}

function formatViewCount(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return `${k >= 10 || k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return String(value);
}

/** Daily impression band at the $10/day reference spend. */
const DAILY_VIEW_BAND: Record<
  BoostCampaignProduct,
  { low: number; high: number }
> = {
  boosted_profile: { low: 40, high: 90 },
  category_spotlight: { low: 55, high: 120 },
  homepage_spotlight: { low: 80, high: 180 },
};

export function estimateBoostViews(
  product: BoostCampaignProduct,
  dailyCents: number,
  days: number
): { low: number; high: number; label: string } {
  const daily = clampBoostDailyCents(dailyCents);
  const duration = clampBoostDays(days);
  const scale = daily / BOOST_CAMPAIGN_DEFAULT_DAILY_CENTS;
  const band = DAILY_VIEW_BAND[product];
  const low = Math.max(10, Math.round(band.low * scale * duration));
  const high = Math.max(low + 10, Math.round(band.high * scale * duration));
  return {
    low,
    high,
    label: `${formatViewCount(low)}–${formatViewCount(high)}`,
  };
}

export function boostCampaignSummary(input: {
  dailyCents: number;
  days: number;
  proPlus: boolean;
  product: BoostCampaignProduct;
}): {
  days: number;
  dailyCents: number;
  listCents: number;
  payCents: number;
  discountCents: number;
  viewsLabel: string;
  dailyLabel: string;
  durationLabel: string;
  listLabel: string;
  payLabel: string;
  discountPercent: number;
} {
  const days = clampBoostDays(input.days);
  const dailyCents = clampBoostDailyCents(input.dailyCents);
  const listCents = boostCampaignListCents(dailyCents, days);
  const payCents = boostCampaignPayCents(dailyCents, days, input.proPlus);
  const views = estimateBoostViews(input.product, dailyCents, days);
  return {
    days,
    dailyCents,
    listCents,
    payCents,
    discountCents: Math.max(0, listCents - payCents),
    viewsLabel: views.label,
    dailyLabel: `${formatBoostUsd(dailyCents)}/day`,
    durationLabel: days === 1 ? "1 day" : `${days} days`,
    listLabel: formatBoostUsd(listCents),
    payLabel: formatBoostUsd(payCents),
    discountPercent: input.proPlus ? PRO_PLUS_BOOST_PERCENT_OFF : 0,
  };
}

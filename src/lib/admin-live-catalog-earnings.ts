import {
  SPECIALIST_AD_ADDON_CATALOG,
  SPECIALIST_TIER_CATALOG,
} from "@/data/admin-specialist-billing-catalog";

export interface LiveBillingFlagRow {
  isPremium: boolean;
  featured: boolean;
  sponsored: boolean;
  topRanked: boolean;
}

export interface LiveCatalogEarnings {
  paidSubscriberCount: number;
  /** Monthly tier list-price total (premium / platinum) */
  subscriberRevenueCents: number;
  /** Monthly placement list-price total (featured / sponsored / top ranked) */
  adRevenueCents: number;
}

/**
 * Estimate monthly earnings from live admin flags × published catalog prices.
 * Not Stripe — reflects what is toggled on approved specialists today.
 */
export function estimateCatalogMonthlyEarningsFromFlags(
  profiles: readonly LiveBillingFlagRow[]
): LiveCatalogEarnings {
  let paidSubscriberCount = 0;
  let subscriberRevenueCents = 0;
  let adRevenueCents = 0;

  for (const profile of profiles) {
    if (profile.isPremium && profile.featured) {
      paidSubscriberCount += 1;
      subscriberRevenueCents += SPECIALIST_TIER_CATALOG.platinum.monthlyCents;
    } else if (profile.isPremium) {
      paidSubscriberCount += 1;
      subscriberRevenueCents += SPECIALIST_TIER_CATALOG.premium.monthlyCents;
    }

    if (profile.featured) {
      adRevenueCents +=
        SPECIALIST_AD_ADDON_CATALOG.homepage_spotlight.monthlyCents;
    }
    if (profile.sponsored) {
      adRevenueCents +=
        SPECIALIST_AD_ADDON_CATALOG.boosted_profile.monthlyCents;
    }
    if (profile.topRanked) {
      adRevenueCents +=
        SPECIALIST_AD_ADDON_CATALOG.top_ranking_boost.monthlyCents;
    }
  }

  return {
    paidSubscriberCount,
    subscriberRevenueCents,
    adRevenueCents,
  };
}

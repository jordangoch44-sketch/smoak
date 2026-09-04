/**
 * Specialist boost add-on details — copy for the Boost profile modal.
 * Pricing stays in `SPECIALIST_AD_ADDON_CATALOG`; this is presentation only.
 */

import {
  formatListPriceLabel,
  listPriceCents,
  productLabel,
  SMOAC_ADDON_PRODUCTS,
  type SmoacAddonProduct,
} from "@/lib/stripe/products";

export interface BoostProductDetail {
  key: SmoacAddonProduct;
  label: string;
  /** One-line pitch under the name */
  tagline: string;
  priceLabel: string;
  /** Concrete outcomes of buying this boost */
  youGet: readonly string[];
  /** Surfaces where the placement appears */
  appearsOn: readonly string[];
  /** Honest limits — what this boost does not do */
  willNot: readonly string[];
}

const BOOST_DETAILS: Record<SmoacAddonProduct, Omit<BoostProductDetail, "key" | "label" | "priceLabel">> =
  {
    boosted_profile: {
      tagline: "Show up in the homepage Sponsored rail near clients browsing SMOAC.",
      youGet: [
        "A labeled Sponsored card on the Marketplace homepage",
        "Geo-aware placement so nearby clients see you first in that rail",
        "Separate from Pro — works on Free, Pro, or Pro Plus",
      ],
      appearsOn: [
        "Homepage Sponsored specialists carousel",
        "Profile sheet Picks for you rail",
        "Homepage cards marked Sponsored",
      ],
      willNot: [
        "Does not change organic SMOAC review ranks",
        "Does not pin you first in Explore category browse",
        "Does not unlock Pro analytics",
      ],
    },
    homepage_spotlight: {
      tagline: "Featured homepage spotlight — the premium discovery rail.",
      youGet: [
        "A labeled Featured card on the Marketplace homepage spotlight rail",
        "Higher-visibility placement than standard Sponsored",
        "Separate from Pro Plus — this is a paid Boost",
      ],
      appearsOn: [
        "Homepage Featured spotlight rail",
        "Client-facing cards marked Featured",
      ],
      willNot: [
        "Does not grant Pro analytics by itself",
        "Does not replace organic Top Rated rankings",
        "Does not auto-include Sponsored or category pins",
      ],
    },
    category_spotlight: {
      tagline: "Pin first when clients browse your profession or specialty in Search.",
      youGet: [
        "Priority placement at the top of matching Explore results",
        "A Category spotlight label so clients know it’s a paid pin",
        "Works when clients filter by your profession or specialty",
      ],
      appearsOn: [
        "Explore / Search results while browsing a matching category",
        "Cards marked Category spotlight",
      ],
      willNot: [
        "Does not appear when clients aren’t browsing that category",
        "Does not alter organic city rankings or review scores",
        "Does not place you on the homepage Sponsored rail",
      ],
    },
    top_ranking_boost: {
      tagline: "Sit beside city rankings in a labeled boost strip — without faking a rank.",
      youGet: [
        "A labeled Ranking boost placement on City Rankings",
        "Visibility on City Rankings in a clear paid strip",
        "Honest separation from competitive SMOAC review order",
      ],
      appearsOn: [
        "City Rankings page (boost strip)",
        "Cards marked Ranking boost",
      ],
      willNot: [
        "Does not buy or change your organic SMOAC rank number",
        "Does not average into review scores or star ratings",
        "Does not replace Featured or Sponsored homepage rails",
      ],
    },
  };

export const BOOST_PRODUCT_DETAILS: readonly BoostProductDetail[] =
  SMOAC_ADDON_PRODUCTS.map((key) => ({
    key,
    label: productLabel(key),
    priceLabel: formatListPriceLabel(listPriceCents(key)),
    ...BOOST_DETAILS[key],
  }));

export function getBoostProductDetail(
  key: SmoacAddonProduct
): BoostProductDetail {
  const found = BOOST_PRODUCT_DETAILS.find((item) => item.key === key);
  if (!found) {
    throw new Error(`Unknown boost product: ${key}`);
  }
  return found;
}

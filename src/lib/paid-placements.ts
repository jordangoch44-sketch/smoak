/**
 * Paid placement helpers — map Stripe entitlement flags to discovery surfaces.
 * Organic SMOAC rankings stay pure; boosts use labeled rails / sort pins.
 */

import {
  listPublicMarketplaceTrainers,
  type PublicCatalogOptions,
} from "@/lib/marketplace-public-catalog";
import {
  selectPlacementRailTrainers,
  type SponsoredRailResult,
} from "@/lib/sponsored-rail";
import { trainerMatchesProfessionCategory } from "@/lib/profession-category";
import type { Trainer } from "@/types/trainer";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Homepage spotlight (featured / homepage_spotlight Boost add-on). */
export function listPublicFeaturedTrainers(
  options: PublicCatalogOptions = {}
): Trainer[] {
  return listPublicMarketplaceTrainers(options).filter(
    (trainer) => trainer.featured === true
  );
}

export function trainerMatchesCategoryBrowse(
  trainer: Trainer,
  filters: { profession?: string; specialty?: string }
): boolean {
  const profession = filters.profession?.trim() ?? "";
  const specialty = filters.specialty?.trim() ?? "";
  if (!profession && !specialty) return false;

  if (profession && trainerMatchesProfessionCategory(trainer, profession)) {
    return true;
  }

  if (specialty) {
    const s = normalize(specialty);
    return (trainer.specialty ?? []).some((item) => {
      const t = normalize(item);
      return t.includes(s) || s.includes(t);
    });
  }

  return false;
}

/** True when Explore is browsing a profession/specialty category. */
export function hasCategoryBrowseFilter(filters: {
  profession?: string;
  specialty?: string;
}): boolean {
  return Boolean(filters.profession?.trim() || filters.specialty?.trim());
}

export function isCategorySpotlightActive(
  trainer: Trainer,
  filters: { profession?: string; specialty?: string }
): boolean {
  return (
    trainer.categorySpotlight === true &&
    trainerMatchesCategoryBrowse(trainer, filters)
  );
}

/**
 * Homepage Featured spotlight rail — same geo shuffle as Sponsored,
 * eligibility is `featured` (not `sponsored`).
 */
export function selectFeaturedSpotlightTrainers(
  candidates: readonly Trainer[],
  opts: {
    personalizationCity: string | null;
    userCoords: { latitude: number; longitude: number } | null;
    limit?: number;
    shuffle?: boolean;
  }
): SponsoredRailResult {
  return selectPlacementRailTrainers(
    candidates.filter((t) => t.featured === true),
    {
      personalizationCity: opts.personalizationCity,
      userCoords: opts.userCoords,
      limit: opts.limit,
      shuffle: opts.shuffle,
    }
  );
}

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
import type { Trainer } from "@/types/trainer";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Homepage spotlight (featured / Platinum / homepage_spotlight add-on). */
export function listPublicFeaturedTrainers(
  options: PublicCatalogOptions = {}
): Trainer[] {
  return listPublicMarketplaceTrainers(options).filter(
    (trainer) => trainer.featured === true
  );
}

/** Top ranking boost — labeled placement only; does not change organic ranks. */
export function listPublicTopRankedBoostTrainers(
  options: PublicCatalogOptions = {}
): Trainer[] {
  return listPublicMarketplaceTrainers(options).filter(
    (trainer) => trainer.topRanked === true
  );
}

export function trainerMatchesCategoryBrowse(
  trainer: Trainer,
  filters: { profession?: string; specialty?: string }
): boolean {
  const profession = filters.profession?.trim() ?? "";
  const specialty = filters.specialty?.trim() ?? "";
  if (!profession && !specialty) return false;

  if (profession) {
    const p = normalize(profession);
    const trainerProf = normalize(trainer.profession ?? "");
    if (trainerProf && (trainerProf.includes(p) || p.includes(trainerProf))) {
      return true;
    }
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
  }
): SponsoredRailResult {
  return selectPlacementRailTrainers(
    candidates.filter((t) => t.featured === true),
    {
      personalizationCity: opts.personalizationCity,
      userCoords: opts.userCoords,
      limit: opts.limit,
    }
  );
}

/**
 * Filter top-ranked boosts to a city (or all if city empty).
 * Prefer specialists in that city; fall back to national pool.
 */
export function selectTopRankedBoostForCity(
  candidates: readonly Trainer[],
  city: string,
  limit = 8
): Trainer[] {
  const cityNorm = normalize(city);
  const pool = candidates.filter((t) => t.topRanked === true);
  if (pool.length === 0) return [];

  if (!cityNorm) return pool.slice(0, limit);

  const local = pool.filter((t) => normalize(t.city) === cityNorm);
  if (local.length >= limit) return local.slice(0, limit);
  if (local.length > 0) {
    const localIds = new Set(local.map((t) => t.id));
    const fill = pool.filter((t) => !localIds.has(t.id));
    return [...local, ...fill].slice(0, limit);
  }
  return pool.slice(0, limit);
}

/**
 * Rankings page boost strip — optional profession filter, city optional.
 */
export function selectTopRankedBoostForRankings(
  candidates: readonly Trainer[],
  opts: { city?: string; profession?: string; limit?: number }
): Trainer[] {
  const limit = opts.limit ?? 6;
  let pool = candidates.filter((t) => t.topRanked === true);
  if (opts.city?.trim()) {
    const cityNorm = normalize(opts.city);
    const local = pool.filter((t) => normalize(t.city) === cityNorm);
    if (local.length > 0) pool = local;
  }
  if (opts.profession?.trim()) {
    const filtered = pool.filter((t) =>
      trainerMatchesCategoryBrowse(t, { profession: opts.profession })
    );
    if (filtered.length > 0) pool = filtered;
  }
  return pool.slice(0, limit);
}

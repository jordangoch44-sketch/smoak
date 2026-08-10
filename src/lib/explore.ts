import type { Trainer, TrainerFilters } from "@/types";
import {
  filterTrainers,
  trainerMatchesSpecialty,
} from "@/lib/trainers";
import {
  getTrainerDistanceMiles,
  sortTrainersByProximity,
  type UserGeoPoint,
} from "@/lib/trainer-proximity-sort";
import { trainerMatchesProfessionCategory } from "@/lib/profession-category";

/** Default search radius around ZIP / search origin (miles). */
export const DEFAULT_EXPLORE_RADIUS_MILES = 5;

/** Wider pool for “Suggested specialists” when the area is empty. */
const SUGGESTED_EXPLORE_RADIUS_MILES = 75;

/** Default filter state for Explore page */
export const EMPTY_TRAINER_FILTERS: TrainerFilters = {
  zipCode: "",
  city: "",
  neighborhood: "",
  profession: "",
  specialty: "",
  gender: "",
  priceMin: "",
  priceMax: "",
  serviceType: "",
};

export function countActiveFilters(filters: TrainerFilters): number {
  const { priceMin, priceMax, ...rest } = filters;
  let count = Object.values(rest).filter(Boolean).length;
  if (priceMin || priceMax) count += 1;
  return count;
}

function matchesSearchQuery(trainer: Trainer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    trainer.name,
    trainer.profession,
    trainer.title,
    trainer.city,
    trainer.neighborhood,
    trainer.location,
    ...(trainer.serviceArea ?? []),
    ...trainer.specialty,
  ]
    .join(" ")
    .toLowerCase();

  /* Prefer any-token match so leftover words rarely zero out a category search */
  const tokens = q.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length <= 1) {
    return haystack.includes(q);
  }
  return tokens.some((token) => haystack.includes(token));
}

/** Combines sidebar filters + search bar query for Explore results */
function filterExploreTrainers(
  trainers: Trainer[],
  filters: TrainerFilters,
  searchQuery: string
): Trainer[] {
  const filtered = filterTrainers(trainers, filters);
  if (!searchQuery.trim()) return filtered;
  return filtered.filter((t) => matchesSearchQuery(t, searchQuery));
}

/** Keep gender / price / service mode; drop location text filters for suggestions. */
function suggestionBaseFilters(filters: TrainerFilters): TrainerFilters {
  return {
    ...EMPTY_TRAINER_FILTERS,
    gender: filters.gender,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    serviceType: filters.serviceType,
  };
}

function categoryAffinityScore(
  trainer: Trainer,
  filters: TrainerFilters
): number {
  let score = 0;
  if (
    filters.profession &&
    trainerMatchesProfessionCategory(trainer, filters.profession)
  ) {
    score += 3;
  }
  if (filters.specialty && trainerMatchesSpecialty(trainer, filters.specialty)) {
    score += 2;
  }
  return score;
}

function filterTrainersWithinRadius(
  trainers: Trainer[],
  origin: UserGeoPoint | null,
  radiusMiles: number | null
): Trainer[] {
  if (!origin || radiusMiles == null) return trainers;
  return trainers.filter((trainer) => {
    const miles = getTrainerDistanceMiles(trainer, origin);
    return miles != null && miles <= radiusMiles;
  });
}

export interface ExploreAreaResult {
  trainers: Trainer[];
  /** True when primary list used an expanded (no hard radius) search */
  nearbyExpanded: boolean;
  /** True when an origin+radius search returned zero in-area matches */
  areaEmpty: boolean;
}

/**
 * Primary Explore matches: category/text filters + optional hard ZIP radius.
 * Does not auto-strip filters — empty area stays empty until the user broadens.
 */
export function filterExploreTrainersInArea(
  trainers: Trainer[],
  filters: TrainerFilters,
  searchQuery: string,
  origin: UserGeoPoint | null,
  options: {
    radiusMiles: number | null;
    nearbyExpanded?: boolean;
  }
): ExploreAreaResult {
  const base = filterExploreTrainers(trainers, filters, searchQuery);
  const radiusMiles = options.nearbyExpanded ? null : options.radiusMiles;
  const inArea = filterTrainersWithinRadius(base, origin, radiusMiles);
  const areaEmpty = Boolean(
    origin &&
      options.radiusMiles != null &&
      !options.nearbyExpanded &&
      inArea.length === 0 &&
      base.length > 0
  );

  return {
    trainers: inArea,
    nearbyExpanded: Boolean(options.nearbyExpanded),
    areaEmpty,
  };
}

/**
 * Nearby suggestions when the area is empty — proximity + category affinity.
 * Read-only ranking over the public catalog (no profile writes).
 */
export function getSuggestedExploreTrainers(
  trainers: Trainer[],
  filters: TrainerFilters,
  origin: UserGeoPoint | null,
  options: {
    excludeIds?: Iterable<string>;
    radiusMiles?: number;
    limit?: number;
  } = {}
): Trainer[] {
  const exclude = new Set(options.excludeIds ?? []);
  const radiusMiles = options.radiusMiles ?? SUGGESTED_EXPLORE_RADIUS_MILES;
  const limit = options.limit ?? 12;

  const soft = filterTrainers(trainers, suggestionBaseFilters(filters)).filter(
    (trainer) => !exclude.has(trainer.id)
  );

  const withDistance = soft
    .map((trainer) => {
      const miles = origin ? getTrainerDistanceMiles(trainer, origin) : null;
      return {
        trainer,
        miles,
        affinity: categoryAffinityScore(trainer, filters),
      };
    })
    .filter((row) => {
      if (!origin) return true;
      if (row.miles == null) return false;
      return row.miles <= radiusMiles;
    })
    .sort((a, b) => {
      if (a.affinity !== b.affinity) return b.affinity - a.affinity;
      if (a.miles == null && b.miles == null) return 0;
      if (a.miles == null) return 1;
      if (b.miles == null) return -1;
      if (a.miles !== b.miles) return a.miles - b.miles;
      return b.trainer.rating - a.trainer.rating;
    });

  if (withDistance.length > 0) {
    return withDistance.slice(0, limit).map((row) => row.trainer);
  }

  /* No geo origin — still suggest closest category affinity from soft pool */
  return sortTrainersByProximity(soft, origin, {
    profession: filters.profession,
    specialty: filters.specialty,
  }).slice(0, limit);
}

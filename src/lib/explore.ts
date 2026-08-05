import type { Trainer, TrainerFilters } from "@/types";
import { filterTrainers } from "@/lib/trainers";

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

/**
 * Whether Explore should leave the browse-categories default and show result cards.
 * Saved ZIP alone does not count — only intentional search / category / mode filters.
 */
export function hasExploreResultsIntent(
  filters: TrainerFilters,
  displayQuery: string,
  nearMeActive = false
): boolean {
  if (displayQuery.trim()) return true;
  if (nearMeActive) return true;
  if (filters.profession || filters.specialty || filters.gender) return true;
  if (filters.priceMin || filters.priceMax) return true;
  if (filters.serviceType) return true;
  return false;
}

export function countActiveFilters(filters: TrainerFilters): number {
  const { priceMin, priceMax, ...rest } = filters;
  let count = Object.values(rest).filter(Boolean).length;
  if (priceMin || priceMax) count += 1;
  return count;
}

export function matchesSearchQuery(trainer: Trainer, query: string): boolean {
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
export function filterExploreTrainers(
  trainers: Trainer[],
  filters: TrainerFilters,
  searchQuery: string
): Trainer[] {
  const filtered = filterTrainers(trainers, filters);
  if (!searchQuery.trim()) return filtered;
  return filtered.filter((t) => matchesSearchQuery(t, searchQuery));
}

export interface ExploreFilterResult {
  trainers: Trainer[];
  /** True when we relaxed filters so the list is not empty */
  broadened: boolean;
}

/**
 * Progressive relaxation so nearby / category searches almost never empty out
 * when the catalog still has specialists.
 */
export function filterExploreTrainersWithFallback(
  trainers: Trainer[],
  filters: TrainerFilters,
  searchQuery: string
): ExploreFilterResult {
  if (trainers.length === 0) {
    return { trainers: [], broadened: false };
  }

  const attempts: Array<{ filters: TrainerFilters; query: string }> = [
    { filters, query: searchQuery },
    { filters, query: "" },
    {
      filters: { ...filters, specialty: "" },
      query: "",
    },
    {
      filters: { ...filters, specialty: "", profession: "" },
      query: "",
    },
    {
      filters: {
        ...EMPTY_TRAINER_FILTERS,
        gender: filters.gender,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        serviceType: filters.serviceType,
      },
      query: "",
    },
    {
      filters: { ...EMPTY_TRAINER_FILTERS },
      query: "",
    },
  ];

  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i]!;
    const result = filterExploreTrainers(
      trainers,
      attempt.filters,
      attempt.query
    );
    if (result.length > 0) {
      return { trainers: result, broadened: i > 0 };
    }
  }

  return { trainers: [...trainers], broadened: true };
}

/** Shared match count for Explore results and filter modal live preview */
export function countExploreTrainerMatches(
  trainers: Trainer[],
  filters: TrainerFilters,
  searchQuery: string
): number {
  return filterExploreTrainersWithFallback(trainers, filters, searchQuery)
    .trainers.length;
}

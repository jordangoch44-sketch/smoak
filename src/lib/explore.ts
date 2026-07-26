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

  return (
    trainer.name.toLowerCase().includes(q) ||
    trainer.profession.toLowerCase().includes(q) ||
    trainer.title.toLowerCase().includes(q) ||
    trainer.city.toLowerCase().includes(q) ||
    trainer.neighborhood.toLowerCase().includes(q) ||
    (trainer.serviceArea?.some((a) => a.toLowerCase().includes(q)) ?? false) ||
    trainer.location.toLowerCase().includes(q) ||
    trainer.specialty.some((s) => s.toLowerCase().includes(q))
  );
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

/** Shared match count for Explore results and filter modal live preview */
export function countExploreTrainerMatches(
  trainers: Trainer[],
  filters: TrainerFilters,
  searchQuery: string
): number {
  return filterExploreTrainers(trainers, filters, searchQuery).length;
}

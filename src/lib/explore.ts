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
  priceMax: "",
};

export function countActiveFilters(filters: TrainerFilters): number {
  return Object.values(filters).filter(Boolean).length;
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

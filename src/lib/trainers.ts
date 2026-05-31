import type { Trainer, TrainerFilters } from "@/types";
import { trainerMatchesExploreLocation } from "@/lib/explore-location-filters";

/** Applies sidebar filter fields (ZIP/location, specialty, gender, price). */
export function filterTrainers(
  trainers: Trainer[],
  filters: TrainerFilters
): Trainer[] {
  return trainers.filter((trainer) => {
    if (!trainerMatchesExploreLocation(trainer, filters)) {
      return false;
    }
    if (filters.profession && trainer.profession !== filters.profession) {
      return false;
    }
    if (filters.specialty && !trainer.specialty.includes(filters.specialty)) {
      return false;
    }
    if (filters.gender && trainer.gender !== filters.gender) {
      return false;
    }
    if (filters.priceMax) {
      const max = parseInt(filters.priceMax, 10);
      if (trainer.pricePerSession > max) {
        return false;
      }
    }
    return true;
  });
}

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
    if (filters.serviceType === "in-person") {
      const mode = trainer.serviceType ?? "both";
      if (mode !== "in-person" && mode !== "both") {
        return false;
      }
    }
    if (filters.serviceType === "virtual") {
      const mode = trainer.serviceType ?? "both";
      if (mode !== "virtual" && mode !== "both") {
        return false;
      }
    }
    if (filters.priceMin) {
      const min = parseInt(filters.priceMin, 10);
      if (Number.isFinite(min) && trainer.pricePerSession < min) {
        return false;
      }
    }
    if (filters.priceMax) {
      const max = parseInt(filters.priceMax, 10);
      if (Number.isFinite(max) && trainer.pricePerSession > max) {
        return false;
      }
    }
    return true;
  });
}

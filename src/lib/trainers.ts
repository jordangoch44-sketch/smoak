import type { Trainer, TrainerFilters } from "@/types";
import { providerMatchesNeighborhood } from "@/lib/provider-location";

/** Applies sidebar filter fields (city, neighborhood, specialty, gender, price). */
export function filterTrainers(
  trainers: Trainer[],
  filters: TrainerFilters
): Trainer[] {
  return trainers.filter((trainer) => {
    if (filters.city && trainer.city !== filters.city) {
      return false;
    }
    if (
      filters.neighborhood &&
      !providerMatchesNeighborhood(trainer, filters.neighborhood)
    ) {
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

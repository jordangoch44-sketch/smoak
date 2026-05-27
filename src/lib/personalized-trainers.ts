import { getFeaturedTrainers } from "@/data/trainers";
import type { Trainer } from "@/types";

function normalizeCity(city: string): string {
  return city.trim().toLowerCase();
}

/** Prioritize trainers in the user's resolved marketplace city. */
export function sortTrainersByPersonalizationCity(
  trainers: Trainer[],
  personalizationCity: string | null
): Trainer[] {
  if (!personalizationCity) return trainers;

  const target = normalizeCity(personalizationCity);
  return [...trainers].sort((a, b) => {
    const aLocal = normalizeCity(a.city) === target;
    const bLocal = normalizeCity(b.city) === target;
    if (aLocal && !bLocal) return -1;
    if (!aLocal && bLocal) return 1;
    return 0;
  });
}

export function getPersonalizedFeaturedTrainers(
  personalizationCity: string | null
): Trainer[] {
  return sortTrainersByPersonalizationCity(
    getFeaturedTrainers(),
    personalizationCity
  );
}

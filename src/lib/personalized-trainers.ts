import { sortTrainersByProximity } from "@/lib/trainer-proximity-sort";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import type { Trainer } from "@/types";

function normalizeCity(city: string): string {
  return city.trim().toLowerCase();
}

function sortByCityFallback(
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

/** Prioritize trainers by distance when coords provided; else marketplace city */
export function sortTrainersByPersonalizationCity(
  trainers: Trainer[],
  personalizationCity: string | null,
  userCoords: UserGeoPoint | null = null
): Trainer[] {
  if (userCoords) {
    return sortTrainersByProximity(trainers, userCoords);
  }
  return sortByCityFallback(trainers, personalizationCity);
}

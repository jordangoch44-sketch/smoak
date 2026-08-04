import { isTrainerSponsored, isTrainerVerified } from "@/lib/trainer-sponsorship";
import { haversineMiles } from "@/lib/geo/haversine";
import {
  getTrainerCoordinates,
  trainerHasResolvableCoordinates,
} from "@/lib/trainer-location";
import {
  hasCategoryBrowseFilter,
  isCategorySpotlightActive,
} from "@/lib/paid-placements";
import type { Trainer } from "@/types";

export interface UserGeoPoint {
  latitude: number;
  longitude: number;
}

export function getTrainerDistanceMiles(
  trainer: Trainer,
  user: UserGeoPoint | null
): number | null {
  if (!user) return null;
  const coords = getTrainerCoordinates(trainer);
  if (!coords) return null;
  return haversineMiles(
    user.latitude,
    user.longitude,
    coords.latitude,
    coords.longitude
  );
}

interface TrainerSortMeta {
  trainer: Trainer;
  categorySpotlight: boolean;
  sponsored: boolean;
  verified: boolean;
  distance: number | null;
  hasCoords: boolean;
}

function buildSortMeta(
  trainer: Trainer,
  user: UserGeoPoint | null,
  categoryFilters: { profession?: string; specialty?: string }
): TrainerSortMeta {
  const distance = getTrainerDistanceMiles(trainer, user);
  return {
    trainer,
    categorySpotlight: isCategorySpotlightActive(trainer, categoryFilters),
    sponsored: isTrainerSponsored(trainer),
    verified: isTrainerVerified(trainer),
    distance,
    hasCoords: trainerHasResolvableCoordinates(trainer),
  };
}

function compareSortMeta(a: TrainerSortMeta, b: TrainerSortMeta): number {
  /* Category spotlight pins to top when browsing a matching category */
  if (a.categorySpotlight !== b.categorySpotlight) {
    return a.categorySpotlight ? -1 : 1;
  }

  if (a.sponsored !== b.sponsored) {
    return a.sponsored ? -1 : 1;
  }

  const aMissing = !a.hasCoords || a.distance === null;
  const bMissing = !b.hasCoords || b.distance === null;
  if (aMissing !== bMissing) {
    return aMissing ? 1 : -1;
  }

  if (!aMissing && !bMissing && a.distance !== null && b.distance !== null) {
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
  }

  if (a.verified !== b.verified) {
    return a.verified ? -1 : 1;
  }

  if (b.trainer.rating !== a.trainer.rating) {
    return b.trainer.rating - a.trainer.rating;
  }

  return b.trainer.reviewCount - a.trainer.reviewCount;
}

/**
 * Explore sort (after category / text filters):
 * 1. Category spotlight (when profession/specialty browse matches)
 * 2. Sponsored boost
 * 3. Proximity (closest first)
 * 4. Verified + rating
 */
export function sortTrainersByProximity(
  trainers: readonly Trainer[],
  user: UserGeoPoint | null,
  categoryFilters: { profession?: string; specialty?: string } = {}
): Trainer[] {
  const useCategoryPin = hasCategoryBrowseFilter(categoryFilters);
  const filters = useCategoryPin ? categoryFilters : {};

  return [...trainers]
    .map((trainer) => buildSortMeta(trainer, user, filters))
    .sort(compareSortMeta)
    .map((entry) => entry.trainer);
}

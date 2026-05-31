import { haversineMiles } from "@/lib/geo/haversine";
import {
  getTrainerCoordinates,
  trainerHasResolvableCoordinates,
} from "@/lib/trainer-location";
import {
  isTrainerSponsored,
  isTrainerVerified,
} from "@/lib/trainer-sponsorship";
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
  sponsored: boolean;
  verified: boolean;
  distance: number | null;
  hasCoords: boolean;
}

function buildSortMeta(
  trainer: Trainer,
  user: UserGeoPoint | null
): TrainerSortMeta {
  const distance = getTrainerDistanceMiles(trainer, user);
  return {
    trainer,
    sponsored: isTrainerSponsored(trainer),
    verified: isTrainerVerified(trainer),
    distance,
    hasCoords: trainerHasResolvableCoordinates(trainer),
  };
}

function compareSortMeta(a: TrainerSortMeta, b: TrainerSortMeta): number {
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
 * Sponsored first, then verified organic by nearest distance, then remainder.
 * Profiles without coordinates sink to the bottom of their tier.
 */
export function sortTrainersByProximity(
  trainers: readonly Trainer[],
  user: UserGeoPoint | null
): Trainer[] {
  if (!user) return [...trainers];

  return [...trainers]
    .map((trainer) => buildSortMeta(trainer, user))
    .sort(compareSortMeta)
    .map((entry) => entry.trainer);
}

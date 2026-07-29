import { getTrainerDistanceMiles } from "@/lib/trainer-proximity-sort";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import { isTrainerSponsored } from "@/lib/trainer-sponsorship";
import type { Trainer } from "@/types";

/** Homepage Sponsored rail size */
export const SPONSORED_RAIL_LIMIT = 6;

/** Prefer specialists within this radius when the client has coordinates */
export const SPONSORED_NEARBY_RADIUS_MILES = 40;

function normalizeCity(city: string): string {
  return city.trim().toLowerCase();
}

/** Fisher–Yates — fresh shuffle on each call (page visit / remount). */
export function shuffleTrainers<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

function isNearbySponsored(
  trainer: Trainer,
  personalizationCity: string | null,
  userCoords: UserGeoPoint | null
): boolean {
  if (userCoords) {
    const miles = getTrainerDistanceMiles(trainer, userCoords);
    if (miles != null) {
      return miles <= SPONSORED_NEARBY_RADIUS_MILES;
    }
  }
  if (personalizationCity) {
    return normalizeCity(trainer.city) === normalizeCity(personalizationCity);
  }
  return false;
}

export type SponsoredRailResult = {
  trainers: Trainer[];
  /** True when client ZIP/city/coords scoped the pool */
  isLocal: boolean;
};

/**
 * Homepage Sponsored rail:
 * - Eligible = `sponsored` boost only (not Pro membership)
 * - With location: nearby first, shuffled; fill from farther sponsored if needed
 * - Without location: national/fair shuffle of all sponsored
 */
export function selectSponsoredRailTrainers(
  candidates: readonly Trainer[],
  options: {
    personalizationCity: string | null;
    userCoords: UserGeoPoint | null;
    limit?: number;
  }
): SponsoredRailResult {
  const limit = options.limit ?? SPONSORED_RAIL_LIMIT;
  const sponsored = candidates.filter(isTrainerSponsored);
  if (sponsored.length === 0) {
    return { trainers: [], isLocal: false };
  }

  const hasLocation = Boolean(
    options.userCoords || options.personalizationCity?.trim()
  );

  if (!hasLocation) {
    return {
      trainers: shuffleTrainers(sponsored).slice(0, limit),
      isLocal: false,
    };
  }

  const nearby: Trainer[] = [];
  const farther: Trainer[] = [];
  for (const trainer of sponsored) {
    if (
      isNearbySponsored(
        trainer,
        options.personalizationCity,
        options.userCoords
      )
    ) {
      nearby.push(trainer);
    } else {
      farther.push(trainer);
    }
  }

  const picked = [
    ...shuffleTrainers(nearby),
    ...shuffleTrainers(farther),
  ].slice(0, limit);

  return {
    trainers: picked,
    isLocal: nearby.length > 0,
  };
}

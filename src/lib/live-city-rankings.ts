import {
  listPublicMarketplaceTrainers,
  type PublicCatalogOptions,
} from "@/lib/marketplace-public-catalog";
import type { SpecialistReviewAggregate } from "@/lib/reviews/specialist-review-types";
import {
  buildSmoacRankingsBoard,
  type SmoacRankedSpecialist,
} from "@/lib/smoac-rankings";
import { getTrainerDistanceMiles } from "@/lib/trainer-proximity-sort";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";

const NEARBY_RADIUS_MILES = 40;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Homepage Top Rated Near You — live catalog + SMOAC review ranks.
 * Location filters the pool; order stays competitive by SMOAC score.
 */
export function listLiveTopRatedSpecialistsForCity(
  cityDisplayName: string,
  limit = 20,
  catalogOptions: PublicCatalogOptions = {},
  aggregates: Map<string, SpecialistReviewAggregate> = new Map(),
  userCoords: UserGeoPoint | null = null
): SmoacRankedSpecialist[] {
  const trainers = listPublicMarketplaceTrainers(catalogOptions);
  const city = cityDisplayName.trim();

  let pool = trainers;
  if (city) {
    pool = trainers.filter(
      (trainer) => normalize(trainer.city) === normalize(city)
    );
  } else if (userCoords) {
    pool = trainers.filter((trainer) => {
      const miles = getTrainerDistanceMiles(trainer, userCoords);
      return miles != null && miles <= NEARBY_RADIUS_MILES;
    });
  }

  return buildSmoacRankingsBoard(pool, aggregates, { limit });
}

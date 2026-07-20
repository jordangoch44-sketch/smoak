import {
  listPublicMarketplaceTrainers,
  type PublicCatalogOptions,
} from "@/lib/marketplace-public-catalog";
import type { RankedSpecialist } from "@/data/city-rankings";
import type { Trainer } from "@/types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function scoreTrainer(trainer: Trainer): number {
  const rating = Number.isFinite(trainer.rating) ? trainer.rating : 0;
  const reviews = Number.isFinite(trainer.reviewCount) ? trainer.reviewCount : 0;
  return rating * 20 + Math.min(reviews, 50) * 0.15;
}

/**
 * Live Top Rated rail — published marketplace specialists for a city,
 * sorted by rating/reviews (includes DB-approved profiles; no hardcoding).
 */
export function listLiveTopRatedSpecialistsForCity(
  cityDisplayName: string,
  limit = 20,
  catalogOptions: PublicCatalogOptions = {}
): RankedSpecialist[] {
  const city = cityDisplayName.trim();
  if (!city) return [];

  const trainers = listPublicMarketplaceTrainers(catalogOptions)
    .filter((trainer) => normalize(trainer.city) === normalize(city))
    .sort((a, b) => {
      const scoreDiff = scoreTrainer(b) - scoreTrainer(a);
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);

  return trainers.map((trainer, index) => ({
    rank: index + 1,
    trainer,
    smoacScore: Math.round(scoreTrainer(trainer)),
    experienceYears: 0,
    showTopRatedBadge: index < 5,
  }));
}

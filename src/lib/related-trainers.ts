import type { Trainer } from "@/types";
import { listPublicMarketplaceTrainers } from "@/lib/marketplace-public-catalog";
import { haversineMiles } from "@/lib/geo/haversine";
import { isTrainerSponsored } from "@/lib/trainer-sponsorship";

function normalizeCity(city: string): string {
  return city.trim().toLowerCase();
}

function excludeSelf(trainers: Trainer[], trainerId: string): Trainer[] {
  return trainers.filter((t) => t.id !== trainerId);
}

/**
 * Nearby Boosted Profile placements for the profile “Picks for you” rail.
 * Paid `sponsored` only — no organic fillers. Hidden when nobody is boosting.
 */
export function getSponsoredPicksNearTrainer(
  trainer: Trainer,
  limit = 8
): Trainer[] {
  const catalog = excludeSelf(listPublicMarketplaceTrainers(), trainer.id);
  const nearbyRadiusMiles = 45;

  return catalog
    .filter((candidate) => isTrainerSponsored(candidate))
    .map((candidate) => {
      const sameCity =
        normalizeCity(candidate.city) === normalizeCity(trainer.city);
      let miles = Number.POSITIVE_INFINITY;
      if (
        Number.isFinite(trainer.latitude) &&
        Number.isFinite(trainer.longitude) &&
        Number.isFinite(candidate.latitude) &&
        Number.isFinite(candidate.longitude)
      ) {
        miles = haversineMiles(
          trainer.latitude,
          trainer.longitude,
          candidate.latitude,
          candidate.longitude
        );
      }
      return { candidate, sameCity, miles };
    })
    .filter((row) => row.sameCity || row.miles <= nearbyRadiusMiles)
    .sort((a, b) => a.miles - b.miles)
    .map((row) => row.candidate)
    .slice(0, limit);
}

/** First sentence for hero — keeps the first-viewport scan light */
export function firstSentence(text: string, maxLength = 110): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(.+?[.!?])(\s|$)/);
  const sentence = match?.[1]?.trim() || trimmed;
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength - 1).trimEnd()}…`;
}

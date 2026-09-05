/**
 * Live SMOAC city rankings — competitive board from SMOAC client reviews only.
 * Does not use Google/catalog ★, Sponsored, or Pro.
 */
import type { SpecialistReviewAggregate } from "@/lib/reviews/specialist-review-types";
import { trainerMatchesProfessionCategory } from "@/lib/profession-category";
import { toRankingMetroCity } from "@/lib/ranking-metro";
import type { Trainer } from "@/types";

export interface SmoacRankedSpecialist {
  rank: number;
  displayRank: number;
  trainer: Trainer;
  /** Internal sort key — not shown in rank-only UI */
  sortScore: number;
  avgRating: number;
  reviewCount: number;
}

export interface TrainerCityRankingLive {
  rank: number;
  city: string;
  listingTitle: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Internal ranking strength from SMOAC reviews only.
 * Rating carries most weight; review volume helps up to a soft cap.
 */
export function computeSmoacReviewSortScore(
  avgRating: number | null,
  reviewCount: number
): number {
  const rating = avgRating != null && Number.isFinite(avgRating) ? avgRating : 0;
  const reviews = Number.isFinite(reviewCount) ? Math.max(0, reviewCount) : 0;
  if (rating <= 0 || reviews <= 0) return 0;
  return rating * 20 + Math.min(reviews, 50) * 0.35;
}

function trainerMatchesCity(trainer: Trainer, cityFilter: string): boolean {
  if (!cityFilter.trim()) return true;
  const wanted =
    toRankingMetroCity(cityFilter) ?? cityFilter.trim();
  const got = toRankingMetroCity(trainer.city) ?? trainer.city.trim();
  return normalize(got) === normalize(wanted);
}

function trainerMatchesProfession(
  trainer: Trainer,
  professionFilter: string
): boolean {
  return trainerMatchesProfessionCategory(trainer, professionFilter);
}

function getAggregate(
  trainerId: string,
  aggregates: Map<string, SpecialistReviewAggregate>
): SpecialistReviewAggregate {
  return (
    aggregates.get(trainerId) ?? {
      specialistId: trainerId,
      reviewCount: 0,
      avgRating: null,
    }
  );
}

function compareRanked(
  a: { sortScore: number; reviewCount: number; avgRating: number; name: string },
  b: { sortScore: number; reviewCount: number; avgRating: number; name: string }
): number {
  if (b.sortScore !== a.sortScore) return b.sortScore - a.sortScore;
  if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
  if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
  return a.name.localeCompare(b.name);
}

/**
 * Competitive board: approved trainers with ≥1 SMOAC review, sorted by score.
 * City/profession filter who appears — they do not reshuffle a global list by distance.
 */
export function buildSmoacRankingsBoard(
  trainers: readonly Trainer[],
  aggregates: Map<string, SpecialistReviewAggregate>,
  options?: {
    cityFilter?: string;
    professionFilter?: string;
    limit?: number;
    /** Include specialists with zero SMOAC reviews (sorted last). Default false. */
    includeUnreviewed?: boolean;
  }
): SmoacRankedSpecialist[] {
  const cityFilter = options?.cityFilter ?? "";
  const professionFilter = options?.professionFilter ?? "";
  const includeUnreviewed = options?.includeUnreviewed === true;

  const rows: Array<{
    trainer: Trainer;
    sortScore: number;
    avgRating: number;
    reviewCount: number;
    name: string;
  }> = [];

  for (const trainer of trainers) {
    if (!trainerMatchesCity(trainer, cityFilter)) continue;
    if (!trainerMatchesProfession(trainer, professionFilter)) continue;

    const agg = getAggregate(trainer.id, aggregates);
    if (!includeUnreviewed && agg.reviewCount < 1) continue;

    const avgRating = agg.avgRating ?? 0;
    rows.push({
      trainer,
      sortScore: computeSmoacReviewSortScore(agg.avgRating, agg.reviewCount),
      avgRating,
      reviewCount: agg.reviewCount,
      name: trainer.name,
    });
  }

  rows.sort(compareRanked);
  const limited =
    options?.limit != null ? rows.slice(0, options.limit) : rows;

  return limited.map((row, index) => {
    const rank = index + 1;
    return {
      rank,
      displayRank: rank,
      trainer: row.trainer,
      sortScore: row.sortScore,
      avgRating: row.avgRating,
      reviewCount: row.reviewCount,
    };
  });
}

/** City rank badge for a specialist profile (null if unranked / no SMOAC reviews). */
export function getLiveTrainerCityRanking(
  trainer: Trainer,
  catalog: readonly Trainer[],
  aggregates: Map<string, SpecialistReviewAggregate>
): TrainerCityRankingLive | null {
  const city = trainer.city.trim();
  if (!city) return null;

  const metro = toRankingMetroCity(city) ?? city;
  const board = buildSmoacRankingsBoard(catalog, aggregates, {
    cityFilter: metro,
  });
  const row = board.find((entry) => entry.trainer.id === trainer.id);
  if (!row) return null;

  return {
    rank: row.rank,
    city: metro,
    listingTitle: `Top rated in ${metro}`,
  };
}

/** Unique cities present in the live catalog (for filter dropdown). */
export function listRankingCitiesFromCatalog(
  trainers: readonly Trainer[]
): string[] {
  const set = new Set<string>();
  for (const trainer of trainers) {
    const city = trainer.city.trim();
    if (city) set.add(city);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

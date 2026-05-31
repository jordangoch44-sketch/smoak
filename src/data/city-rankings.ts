import { getTrainerById } from "@/data/trainers";
import { sortTrainersByProximity } from "@/lib/trainer-proximity-sort";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import type { Trainer } from "@/types";

/** Single entry in a city Top 50 leaderboard (mock / future API shape) */
export interface CityRankingEntry {
  rank: number;
  trainerId: string;
  smoacScore: number;
  experienceYears: number;
  /** Show “Top Rated” badge — default for podium ranks */
  topRated?: boolean;
}

export interface CityTop50Listing {
  city: string;
  slug: string;
  /** e.g. “Top 50 in San Diego” */
  displayTitle: string;
  subtitle: string;
  entries: CityRankingEntry[];
}

export interface RankedSpecialist {
  rank: number;
  trainer: Trainer;
  smoacScore: number;
  experienceYears: number;
  showTopRatedBadge: boolean;
}

export interface RankingsBoardRow extends RankedSpecialist {
  /** Recomputed order when filters are applied */
  displayRank: number;
}

/** Default marketplace city until geo/search detection ships */
export const DEFAULT_RANKING_CITY_SLUG = "san-diego";

/** Major market city filter options for the rankings board */
export const RANKINGS_CITY_OPTIONS = [
  { value: "", label: "All Cities" },
  { value: "San Diego", label: "San Diego" },
  { value: "Los Angeles", label: "Los Angeles" },
  { value: "Austin", label: "Austin" },
  { value: "San Francisco", label: "San Francisco" },
  { value: "New York", label: "New York" },
  { value: "Miami", label: "Miami" },
  { value: "Dallas", label: "Dallas" },
  { value: "Chicago", label: "Chicago" },
  { value: "Phoenix", label: "Phoenix" },
  { value: "Las Vegas", label: "Las Vegas" },
] as const;

/** Broad profession filter options for the rankings board */
export const RANKINGS_PROFESSION_OPTIONS = [
  { value: "", label: "All Professions" },
  { value: "personal-trainer", label: "Personal Trainer" },
  { value: "physical-therapist", label: "Physical Therapist" },
  { value: "chiropractor", label: "Chiropractor" },
  { value: "nutritionist", label: "Nutritionist" },
  { value: "massage-therapist", label: "Massage Therapist" },
  { value: "recovery-specialist", label: "Recovery Specialist" },
  { value: "wellness-coach", label: "Wellness Coach" },
] as const;

/**
 * Mock Top 50 ordering for San Diego metro.
 * TODO(city-rankings): Replace with API sorted by rating, reviews, and local signals.
 */
const SAN_DIEGO_TOP_50: CityTop50Listing = {
  city: "San Diego",
  slug: DEFAULT_RANKING_CITY_SLUG,
  displayTitle: "Top 50 in San Diego",
  subtitle: "The highest-rated health & wellness specialists near you.",
  entries: [
    { rank: 1, trainerId: "anthony-brooks", smoacScore: 97, experienceYears: 8, topRated: true },
    { rank: 2, trainerId: "elena-ramirez", smoacScore: 95, experienceYears: 10, topRated: true },
    { rank: 3, trainerId: "marcus-lee", smoacScore: 94, experienceYears: 12, topRated: true },
    { rank: 4, trainerId: "sophia-bennett", smoacScore: 93, experienceYears: 6, topRated: true },
    { rank: 5, trainerId: "jordan-kim", smoacScore: 91, experienceYears: 7, topRated: true },
    { rank: 6, trainerId: "elena-vasquez", smoacScore: 90, experienceYears: 9 },
    { rank: 7, trainerId: "david-okonkwo", smoacScore: 89, experienceYears: 11 },
    { rank: 8, trainerId: "marcus-chen", smoacScore: 88, experienceYears: 8 },
    { rank: 9, trainerId: "sophia-laurent", smoacScore: 87, experienceYears: 10 },
    { rank: 10, trainerId: "james-morrison", smoacScore: 86, experienceYears: 9 },
    { rank: 11, trainerId: "amara-johnson", smoacScore: 85, experienceYears: 6 },
    { rank: 12, trainerId: "kai-nakamura", smoacScore: 84, experienceYears: 5 },
    { rank: 13, trainerId: "isabella-romano", smoacScore: 83, experienceYears: 7 },
  ],
};

const LISTINGS_BY_SLUG: Record<string, CityTop50Listing> = {
  [DEFAULT_RANKING_CITY_SLUG]: SAN_DIEGO_TOP_50,
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Match trainer major market city only (neighborhood is display-only) */
function trainerMatchesCity(trainer: Trainer, cityFilter: string): boolean {
  if (!cityFilter) return true;
  return normalize(trainer.city) === normalize(cityFilter);
}

const PROFESSION_FILTER_MATCHERS: Record<string, (profession: string) => boolean> = {
  "personal-trainer": (p) => p === "personal trainer",
  "physical-therapist": (p) => p === "physical therapist",
  chiropractor: (p) => p === "chiropractor",
  nutritionist: (p) => p === "nutritionist",
  "massage-therapist": (p) => p === "massage therapist",
  "recovery-specialist": (p) => p === "recovery specialist",
  "wellness-coach": (p) => p === "wellness coach",
};

function trainerMatchesProfession(trainer: Trainer, professionFilter: string): boolean {
  if (!professionFilter) return true;

  const profession = normalize(trainer.profession);
  const matcher = PROFESSION_FILTER_MATCHERS[professionFilter];
  return matcher?.(profession) ?? false;
}

export function getCityTop50Listing(
  citySlug: string = DEFAULT_RANKING_CITY_SLUG
): CityTop50Listing {
  return LISTINGS_BY_SLUG[citySlug] ?? SAN_DIEGO_TOP_50;
}

function sortRankedSpecialistsByProximity(
  rows: RankedSpecialist[],
  user: UserGeoPoint | null
): RankedSpecialist[] {
  if (!user || rows.length === 0) return rows;

  const sortedTrainers = sortTrainersByProximity(
    rows.map((row) => row.trainer),
    user
  );
  const order = new Map(sortedTrainers.map((trainer, index) => [trainer.id, index]));

  return [...rows]
    .sort(
      (a, b) =>
        (order.get(a.trainer.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.trainer.id) ?? Number.MAX_SAFE_INTEGER)
    )
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

/** Canonical listing order — safe for SSR / hydration */
export function getRankedSpecialistsBaseline(
  citySlug: string = DEFAULT_RANKING_CITY_SLUG
): RankedSpecialist[] {
  const listing = getCityTop50Listing(citySlug);
  const results: RankedSpecialist[] = [];

  for (const entry of listing.entries) {
    const trainer = getTrainerById(entry.trainerId);
    if (!trainer) continue;
    results.push({
      rank: entry.rank,
      trainer,
      smoacScore: entry.smoacScore,
      experienceYears: entry.experienceYears,
      showTopRatedBadge: entry.topRated ?? entry.rank <= 3,
    });
  }

  return results;
}

/** @deprecated Use getRankedSpecialistsBaseline + client proximity sort */
export function getRankedSpecialistsForCity(
  citySlug: string = DEFAULT_RANKING_CITY_SLUG
): RankedSpecialist[] {
  return getRankedSpecialistsBaseline(citySlug);
}

export { sortRankedSpecialistsByProximity };

/** City ranking snapshot for a single trainer profile (null if unranked) */
export interface TrainerCityRanking {
  rank: number;
  city: string;
  listingTitle: string;
}

const RANKING_BY_TRAINER_ID: Map<string, TrainerCityRanking> = (() => {
  const map = new Map<string, TrainerCityRanking>();
  for (const listing of Object.values(LISTINGS_BY_SLUG)) {
    for (const entry of listing.entries) {
      map.set(entry.trainerId, {
        rank: entry.rank,
        city: listing.city,
        listingTitle: listing.displayTitle,
      });
    }
  }
  return map;
})();

/** Lookup city rank for profile badge — undefined when trainer is not ranked */
export function getTrainerCityRanking(
  trainerId: string
): TrainerCityRanking | undefined {
  return RANKING_BY_TRAINER_ID.get(trainerId);
}

export function getRankingsBoardRows(options?: {
  citySlug?: string;
  cityFilter?: string;
  professionFilter?: string;
}): RankingsBoardRow[] {
  return buildRankingsBoardBaseline(options);
}

export function sortRankingsBoardByProximity(
  rows: RankingsBoardRow[],
  user: UserGeoPoint | null
): RankingsBoardRow[] {
  if (!user || rows.length === 0) return rows;

  const sorted = sortTrainersByProximity(
    rows.map((row) => row.trainer),
    user
  );
  const order = new Map(sorted.map((trainer, index) => [trainer.id, index]));

  return [...rows]
    .sort(
      (a, b) =>
        (order.get(a.trainer.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.trainer.id) ?? Number.MAX_SAFE_INTEGER)
    )
    .map((row, index) => ({
      ...row,
      displayRank: index + 1,
    }));
}

function buildRankingsBoardBaseline(
  options?: {
    citySlug?: string;
    cityFilter?: string;
    professionFilter?: string;
  }
): RankingsBoardRow[] {
  const listing = getCityTop50Listing(options?.citySlug);
  const cityFilter = options?.cityFilter ?? "";
  const professionFilter = options?.professionFilter ?? "";

  const rows: RankingsBoardRow[] = [];

  for (const entry of listing.entries) {
    const trainer = getTrainerById(entry.trainerId);
    if (!trainer) continue;
    if (!trainerMatchesCity(trainer, cityFilter)) continue;
    if (!trainerMatchesProfession(trainer, professionFilter)) continue;

    rows.push({
      rank: entry.rank,
      displayRank: 0,
      trainer,
      smoacScore: entry.smoacScore,
      experienceYears: entry.experienceYears,
      showTopRatedBadge: entry.topRated ?? entry.rank <= 3,
    });
  }

  return rows;
}

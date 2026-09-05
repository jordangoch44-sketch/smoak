/**
 * Shared rankings filter options + demo city-rank lookup for the specialist
 * dashboard preview. Live boards use `lib/smoac-rankings.ts`.
 */

import { MAIN_PROFESSION_CATEGORIES } from "@/data/professions";

/** Single entry in a city leaderboard (demo / seed shape) */
interface CityRankingEntry {
  rank: number;
  trainerId: string;
}

interface CityTop50Listing {
  city: string;
  slug: string;
  /** e.g. “Top 50 in San Diego” */
  displayTitle: string;
  subtitle: string;
  entries: CityRankingEntry[];
}

/** Default marketplace city until geo/search detection ships */
const DEFAULT_RANKING_CITY_SLUG = "san-diego";

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
  ...MAIN_PROFESSION_CATEGORIES.map((profession) => ({
    value: profession,
    label: profession,
  })),
] as const;

/**
 * Demo Top 50 ordering for San Diego — used only by the demo specialist dashboard.
 * Public rankings use live SMOAC review aggregates.
 */
const SAN_DIEGO_TOP_50: CityTop50Listing = {
  city: "San Diego",
  slug: DEFAULT_RANKING_CITY_SLUG,
  displayTitle: "Top 50 in San Diego",
  subtitle: "The highest-rated health & wellness specialists near you.",
  entries: [
    { rank: 1, trainerId: "anthony-brooks" },
    { rank: 2, trainerId: "elena-ramirez" },
    { rank: 3, trainerId: "marcus-lee" },
    { rank: 4, trainerId: "sophia-bennett" },
    { rank: 5, trainerId: "jordan-kim" },
    { rank: 6, trainerId: "elena-vasquez" },
    { rank: 7, trainerId: "david-okonkwo" },
    { rank: 8, trainerId: "marcus-chen" },
    { rank: 9, trainerId: "sophia-laurent" },
    { rank: 10, trainerId: "james-morrison" },
    { rank: 11, trainerId: "amara-johnson" },
    { rank: 12, trainerId: "kai-nakamura" },
    { rank: 13, trainerId: "isabella-romano" },
  ],
};

const LISTINGS_BY_SLUG: Record<string, CityTop50Listing> = {
  [DEFAULT_RANKING_CITY_SLUG]: SAN_DIEGO_TOP_50,
};

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

/** Lookup demo city rank for specialist dashboard preview */
export function getTrainerCityRanking(
  trainerId: string
): TrainerCityRanking | undefined {
  return RANKING_BY_TRAINER_ID.get(trainerId);
}

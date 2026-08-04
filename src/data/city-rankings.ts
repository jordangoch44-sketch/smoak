/**
 * Shared rankings filter options + demo city-rank lookup for the specialist
 * dashboard preview. Live boards use `lib/smoac-rankings.ts`.
 */

/** Single entry in a city leaderboard (demo / seed shape) */
interface CityRankingEntry {
  rank: number;
  trainerId: string;
  smoacScore: number;
  experienceYears: number;
  /** Show “Top Rated” badge — default for podium ranks */
  topRated?: boolean;
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
  { value: "personal-trainer", label: "Personal Trainer" },
  { value: "physical-therapist", label: "Physical Therapist" },
  { value: "chiropractor", label: "Chiropractor" },
  { value: "nutritionist", label: "Nutritionist" },
  { value: "massage-therapist", label: "Massage Therapist" },
  { value: "recovery-specialist", label: "Recovery Specialist" },
  { value: "wellness-coach", label: "Wellness Coach" },
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

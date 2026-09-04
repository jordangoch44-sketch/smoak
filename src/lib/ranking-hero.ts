import {
  DEFAULT_RANKING_CITY,
  toRankingMetroCity,
  type RankingMetroCity,
} from "@/lib/ranking-metro";

export type RankingHeroSkyline = {
  src: string;
  alt: string;
};

const RANKING_HERO_SKYLINES: Record<RankingMetroCity, RankingHeroSkyline> = {
  "San Diego": {
    src: "/images/rankings/san-diego.jpg",
    alt: "San Diego skyline at dusk",
  },
  "Los Angeles": {
    src: "/images/rankings/los-angeles.jpg",
    alt: "Los Angeles skyline at dusk",
  },
  Austin: {
    src: "/images/rankings/austin.jpg",
    alt: "Austin skyline at dusk",
  },
  "San Francisco": {
    src: "/images/rankings/san-francisco.jpg",
    alt: "San Francisco skyline at dusk",
  },
  "New York": {
    src: "/images/rankings/new-york.jpg",
    alt: "New York City skyline at dusk",
  },
  Miami: {
    src: "/images/rankings/miami.jpg",
    alt: "Miami skyline at dusk",
  },
  Dallas: {
    src: "/images/rankings/dallas.jpg",
    alt: "Dallas skyline at dusk",
  },
  Chicago: {
    src: "/images/rankings/chicago.jpg",
    alt: "Chicago skyline at dusk",
  },
  Phoenix: {
    src: "/images/rankings/phoenix.jpg",
    alt: "Phoenix skyline at dusk",
  },
  "Las Vegas": {
    src: "/images/rankings/las-vegas.jpg",
    alt: "Las Vegas skyline at dusk",
  },
};

/** City the rankings hero should visualize (San Diego when none is selected). */
export function rankingHeroMetro(cityFilter: string): RankingMetroCity {
  return toRankingMetroCity(cityFilter) ?? DEFAULT_RANKING_CITY;
}

export function rankingHeroSkyline(cityFilter: string): RankingHeroSkyline {
  return RANKING_HERO_SKYLINES[rankingHeroMetro(cityFilter)];
}

/** Large hero title — a metro name, or All Cities when the filter is cleared. */
export function rankingHeroTitle(cityFilter: string): string {
  const trimmed = cityFilter.trim();
  return trimmed || "All Cities";
}

/** Selected rankings city: location metro, else San Diego, unless the user picked one. */
export function resolveRankingsSelectedCity(input: {
  hydrated: boolean;
  cityTouched: boolean;
  cityOverride: string;
  metroFromLocation: RankingMetroCity | null;
}): string {
  if (input.cityTouched) return input.cityOverride;
  if (!input.hydrated) return DEFAULT_RANKING_CITY;
  return input.metroFromLocation ?? DEFAULT_RANKING_CITY;
}

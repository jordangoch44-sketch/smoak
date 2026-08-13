/**
 * Marketplace geography — cities and dependent neighborhoods/areas.
 *
 * TODO(provider-onboarding): Replace static config with provider-selected values:
 * - primaryCity
 * - primaryNeighborhood
 * - serviceAreas[] (neighborhoods served)
 * Location on provider records will be sourced from signup/admin, not hand-edited seed data.
 */

export const MARKETPLACE_CITIES = [
  "San Diego",
  "Los Angeles",
  "Orange County",
  "Riverside",
  "Temecula",
  "Chula Vista",
  "Oceanside",
  "Carlsbad",
  "Encinitas",
  "Escondido",
] as const;

export type MarketplaceCity = (typeof MARKETPLACE_CITIES)[number];

/** Neighborhoods / areas keyed by city name */
export const CITY_NEIGHBORHOODS: Record<MarketplaceCity, readonly string[]> = {
  "San Diego": [
    "Mira Mesa",
    "Sorrento Valley",
    "La Jolla",
    "Del Mar",
    "Carmel Valley",
    "Pacific Beach",
    "Mission Valley",
    "North Park",
    "Hillcrest",
    "Downtown San Diego",
    "Little Italy",
    "Point Loma",
    "Ocean Beach",
    "University City",
    "Rancho Bernardo",
    "Rancho Peñasquitos",
    "Poway",
    "4S Ranch",
    "Scripps Ranch",
    "Clairemont",
    "Kearny Mesa",
    "Mission Hills",
    "Bankers Hill",
    "Old Town",
    "Bay Park",
  ],
  "Los Angeles": [
    "West Hollywood",
    "Santa Monica",
    "Venice",
    "Downtown LA",
    "Silver Lake",
    "Beverly Hills",
    "Studio City",
  ],
  "Orange County": [
    "Irvine",
    "Newport Beach",
    "Huntington Beach",
    "Costa Mesa",
    "Anaheim Hills",
  ],
  Riverside: ["Downtown Riverside", "Canyon Crest", "Orangecrest"],
  Temecula: ["Old Town", "Redhawk", "Wolf Creek"],
  "Chula Vista": ["Eastlake", "Otay Ranch", "Bonita"],
  Oceanside: ["South Oceanside", "Fire Mountain", "Downtown Oceanside"],
  Carlsbad: ["Village", "La Costa", "Bressi Ranch"],
  Encinitas: ["Leucadia", "Cardiff", "New Encinitas"],
  Escondido: ["Downtown Escondido", "San Pasqual Valley"],
};

export function getNeighborhoodsForCity(city: string): readonly string[] {
  if (!city) return [];
  return CITY_NEIGHBORHOODS[city as MarketplaceCity] ?? [];
}

export function isMarketplaceCity(city: string): city is MarketplaceCity {
  return (MARKETPLACE_CITIES as readonly string[]).includes(city);
}

import {
  CITY_NEIGHBORHOODS,
  MARKETPLACE_CITIES,
  type MarketplaceCity,
} from "@/data/locations";
import { haversineKm } from "@/lib/geo/haversine";

/** Major ranking metros — suburbs roll up here (Oceanside → San Diego). */
export const RANKING_METRO_CITIES = [
  "San Diego",
  "Los Angeles",
  "Austin",
  "San Francisco",
  "New York",
  "Miami",
  "Dallas",
  "Chicago",
  "Phoenix",
  "Las Vegas",
] as const;

export type RankingMetroCity = (typeof RANKING_METRO_CITIES)[number];

const RANKING_METRO_CENTERS: Record<
  RankingMetroCity,
  { lat: number; lng: number }
> = {
  "San Diego": { lat: 32.7157, lng: -117.1611 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  Austin: { lat: 30.2672, lng: -97.7431 },
  "San Francisco": { lat: 37.7749, lng: -122.4194 },
  "New York": { lat: 40.7128, lng: -74.006 },
  Miami: { lat: 25.7617, lng: -80.1918 },
  Dallas: { lat: 32.7767, lng: -96.797 },
  Chicago: { lat: 41.8781, lng: -87.6298 },
  Phoenix: { lat: 33.4484, lng: -112.074 },
  "Las Vegas": { lat: 36.1699, lng: -115.1398 },
};

/** Marketplace sub-cities and nearby markets → ranking metro. */
const RANKING_METRO_ALIASES: Record<string, RankingMetroCity> = {
  "san diego": "San Diego",
  "chula vista": "San Diego",
  oceanside: "San Diego",
  carlsbad: "San Diego",
  encinitas: "San Diego",
  escondido: "San Diego",
  temecula: "San Diego",
  "los angeles": "Los Angeles",
  "orange county": "Los Angeles",
  riverside: "Los Angeles",
};

function fold(value: string): string {
  return value.trim().toLowerCase();
}

function isRankingMetroCity(value: string): value is RankingMetroCity {
  return (RANKING_METRO_CITIES as readonly string[]).includes(value);
}

function parentMarketplaceCity(placeName: string): MarketplaceCity | null {
  for (const city of MARKETPLACE_CITIES) {
    if (CITY_NEIGHBORHOODS[city]?.includes(placeName)) return city;
  }
  return null;
}

/** Roll a ZIP place, neighborhood, or marketplace city up to a ranking metro. */
export function toRankingMetroCity(placeName: string): RankingMetroCity | null {
  const trimmed = placeName.trim();
  if (!trimmed) return null;

  if (isRankingMetroCity(trimmed)) return trimmed;

  const aliased = RANKING_METRO_ALIASES[fold(trimmed)];
  if (aliased) return aliased;

  const parent = parentMarketplaceCity(trimmed);
  if (parent) {
    if (isRankingMetroCity(parent)) return parent;
    return RANKING_METRO_ALIASES[fold(parent)] ?? null;
  }

  return null;
}

/** Nearest ranking metro from coordinates (Oceanside ZIP → San Diego). */
export function findNearestRankingMetro(
  latitude: number,
  longitude: number
): RankingMetroCity {
  let nearest: RankingMetroCity = "San Diego";
  let shortest = Infinity;

  for (const city of RANKING_METRO_CITIES) {
    const center = RANKING_METRO_CENTERS[city];
    const distance = haversineKm(
      latitude,
      longitude,
      center.lat,
      center.lng
    );
    if (distance < shortest) {
      shortest = distance;
      nearest = city;
    }
  }

  return nearest;
}

export function resolveRankingMetro(input: {
  placeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): RankingMetroCity | null {
  const lat = input.latitude;
  const lng = input.longitude;
  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return findNearestRankingMetro(lat, lng);
  }

  return input.placeName ? toRankingMetroCity(input.placeName) : null;
}

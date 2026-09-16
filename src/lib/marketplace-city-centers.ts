import type { MarketplaceCity } from "@/data/locations";
import { MARKETPLACE_CITIES } from "@/data/locations";
import { haversineKm } from "@/lib/geo/haversine";

/** Live market until other metros have inventory. Search defaults here with no ZIP/GPS. */
export const DEFAULT_MARKETPLACE_CITY: MarketplaceCity = "San Diego";

/**
 * Cities IP geo may frame. SoCal ISP IPs often mis-resolve to LA / OC / Riverside —
 * those are listed in MARKETPLACE_CITIES for filters, not as an IP origin.
 */
export const LIVE_MARKETPLACE_CITIES = [
  "San Diego",
  "Chula Vista",
  "Oceanside",
  "Carlsbad",
  "Encinitas",
  "Escondido",
  "Temecula",
] as const satisfies readonly MarketplaceCity[];

export type LiveMarketplaceCity = (typeof LIVE_MARKETPLACE_CITIES)[number];

const LIVE_MARKETPLACE_CITY_SET = new Set<string>(LIVE_MARKETPLACE_CITIES);

export function isLiveMarketplaceCity(
  city: string | null | undefined
): city is LiveMarketplaceCity {
  return Boolean(city && LIVE_MARKETPLACE_CITY_SET.has(city));
}

/** Approximate city centers for nearest-market resolution (demo until provider geocoding ships). */
export const MARKETPLACE_CITY_CENTERS: Record<
  MarketplaceCity,
  { lat: number; lng: number }
> = {
  "San Diego": { lat: 32.7157, lng: -117.1611 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  "Orange County": { lat: 33.7175, lng: -117.8311 },
  Riverside: { lat: 33.9533, lng: -117.3962 },
  Temecula: { lat: 33.4936, lng: -117.1484 },
  "Chula Vista": { lat: 32.6401, lng: -117.0842 },
  Oceanside: { lat: 33.1959, lng: -117.3795 },
  Carlsbad: { lat: 33.1581, lng: -117.3506 },
  Encinitas: { lat: 33.037, lng: -117.292 },
  Escondido: { lat: 33.1192, lng: -117.0864 },
};

/**
 * Explore radius when the search origin is a marketplace city / neighborhood
 * (metro frame), not a ZIP centroid. Sized so listed neighborhoods stay inside
 * the city search — e.g. Mira Mesa / Rancho Bernardo vs downtown San Diego.
 */
export const MARKETPLACE_CITY_METRO_RADIUS_MILES: Record<
  MarketplaceCity,
  number
> = {
  "San Diego": 25,
  "Los Angeles": 25,
  "Orange County": 22,
  Riverside: 18,
  Temecula: 15,
  "Chula Vista": 15,
  Oceanside: 15,
  Carlsbad: 15,
  Encinitas: 15,
  Escondido: 15,
};

export function marketplaceMetroRadiusMiles(city: MarketplaceCity): number {
  return MARKETPLACE_CITY_METRO_RADIUS_MILES[city];
}

/** Resolve coordinates to the closest configured marketplace city. */
export function findNearestMarketplaceCity(
  latitude: number,
  longitude: number
): MarketplaceCity {
  let nearest: MarketplaceCity = "San Diego";
  let shortest = Infinity;

  for (const city of MARKETPLACE_CITIES) {
    const center = MARKETPLACE_CITY_CENTERS[city];
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

/** Marketplace city only when the point is actually in that metro (not “nearest US market”). */
export function findNearbyMarketplaceCity(
  latitude: number,
  longitude: number,
  maxKm = 160
): MarketplaceCity | null {
  const nearest = findNearestMarketplaceCity(latitude, longitude);
  const center = MARKETPLACE_CITY_CENTERS[nearest];
  const distance = haversineKm(
    latitude,
    longitude,
    center.lat,
    center.lng
  );
  if (distance > maxKm) return null;
  return nearest;
}

/** IP / camera origin only when the point is in a live San Diego–area metro. */
export function findNearbyLiveMarketplaceCity(
  latitude: number,
  longitude: number,
  maxKm = 160
): LiveMarketplaceCity | null {
  const nearby = findNearbyMarketplaceCity(latitude, longitude, maxKm);
  return isLiveMarketplaceCity(nearby) ? nearby : null;
}

export function defaultMarketplaceCenter(): {
  latitude: number;
  longitude: number;
} {
  const center = MARKETPLACE_CITY_CENTERS[DEFAULT_MARKETPLACE_CITY];
  return { latitude: center.lat, longitude: center.lng };
}

export function marketplaceCityToSlug(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, "-");
}

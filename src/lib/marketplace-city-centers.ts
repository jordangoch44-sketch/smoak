import type { MarketplaceCity } from "@/data/locations";
import { MARKETPLACE_CITIES } from "@/data/locations";

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

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

export function marketplaceCityToSlug(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, "-");
}

import { getEffectiveClientZip } from "@/lib/client-profile-location";
import {
  CITY_NEIGHBORHOODS,
  isMarketplaceCity,
  MARKETPLACE_CITIES,
  type MarketplaceCity,
} from "@/data/locations";
import {
  getZipPlaceDisplayName,
  loadSavedZipCode,
} from "@/lib/user-location-storage";
import { EMPTY_TRAINER_FILTERS } from "@/lib/explore";
import { MARKETPLACE_CITY_CENTERS } from "@/lib/marketplace-city-centers";
import type { AuthSession } from "@/types/auth";
import type { Trainer, TrainerFilters } from "@/types";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import {
  isValidZipCode,
  normalizeZipCode,
} from "@/lib/zip-to-marketplace-city";

function findParentCityForNeighborhood(placeName: string): string {
  for (const city of MARKETPLACE_CITIES) {
    const neighborhoods = CITY_NEIGHBORHOODS[city] ?? [];
    if (neighborhoods.includes(placeName)) {
      return city;
    }
  }
  return "";
}

/**
 * Display helpers for ZIP → place labels (filter chips / drawer).
 * Client ZIP is proximity sort context — not a hard include/exclude filter.
 */
export function exploreFiltersFromZipCode(rawZip: string): TrainerFilters {
  const zip = normalizeZipCode(rawZip.trim());
  if (!isValidZipCode(zip)) {
    return { ...EMPTY_TRAINER_FILTERS, zipCode: rawZip.trim() };
  }

  const placeName = getZipPlaceDisplayName(zip);
  const base: TrainerFilters = {
    ...EMPTY_TRAINER_FILTERS,
    zipCode: zip,
  };

  if (!placeName) {
    return base;
  }

  if (isMarketplaceCity(placeName)) {
    return {
      ...base,
      city: placeName,
      neighborhood: "",
    };
  }

  const parentCity = findParentCityForNeighborhood(placeName);
  return {
    ...base,
    city: parentCity,
    neighborhood: placeName,
  };
}

export function getSavedZipExploreFilters(
  session?: AuthSession | null
): TrainerFilters {
  const zip = getEffectiveClientZip(session ?? null) ?? loadSavedZipCode();
  if (!zip) {
    return { ...EMPTY_TRAINER_FILTERS };
  }
  return exploreFiltersFromZipCode(zip);
}

/**
 * Client location ranks results by distance — it must not become a ZIP/city
 * hard filter (that hid nearby specialists across different ZIPs).
 */
export function mergeExploreFiltersWithSavedLocation(
  filters: TrainerFilters,
  _session?: AuthSession | null
): TrainerFilters {
  return filters;
}

export function hasExploreLocationFilters(filters: TrainerFilters): boolean {
  return Boolean(filters.city || filters.neighborhood);
}

/**
 * Location never excludes specialists. City / neighborhood from search (or
 * chips) only steer proximity sort via `resolveExploreSortOrigin`.
 */
export function trainerMatchesExploreLocation(
  _trainer: Trainer,
  _filters: TrainerFilters
): boolean {
  return true;
}

/** True when the client can sort Explore by proximity. */
export function hasClientSearchLocation(
  session?: AuthSession | null
): boolean {
  return Boolean(getEffectiveClientZip(session ?? null) ?? loadSavedZipCode());
}

/** Extra market centers for NL search cities outside MARKETPLACE_CITIES. */
const SEARCH_CITY_CENTERS: Record<string, UserGeoPoint> = {
  Austin: { latitude: 30.2672, longitude: -97.7431 },
  "San Francisco": { latitude: 37.7749, longitude: -122.4194 },
  "New York": { latitude: 40.7128, longitude: -74.006 },
  Miami: { latitude: 25.7617, longitude: -80.1918 },
  Dallas: { latitude: 32.7767, longitude: -96.797 },
  Chicago: { latitude: 41.8781, longitude: -87.6298 },
  Phoenix: { latitude: 33.4484, longitude: -112.074 },
  "Las Vegas": { latitude: 36.1699, longitude: -115.1398 },
};

/**
 * Sort origin for “near you / near this place”:
 * 1. Parsed search city (or neighborhood’s parent city)
 * 2. Client location coordinates
 */
export function resolveExploreSortOrigin(
  filters: TrainerFilters,
  userCoords: UserGeoPoint | null
): UserGeoPoint | null {
  const city = filters.city.trim();
  if (city) {
    if (isMarketplaceCity(city)) {
      const center = MARKETPLACE_CITY_CENTERS[city as MarketplaceCity];
      return { latitude: center.lat, longitude: center.lng };
    }
    const known = SEARCH_CITY_CENTERS[city];
    if (known) return known;
  }

  const neighborhood = filters.neighborhood.trim();
  if (neighborhood) {
    const parent = findParentCityForNeighborhood(neighborhood);
    if (parent && isMarketplaceCity(parent)) {
      const center = MARKETPLACE_CITY_CENTERS[parent];
      return { latitude: center.lat, longitude: center.lng };
    }
  }

  return userCoords;
}

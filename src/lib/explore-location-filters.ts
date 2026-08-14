import { getEffectiveClientZip } from "@/lib/client-profile-location";
import {
  CITY_NEIGHBORHOODS,
  isMarketplaceCity,
  MARKETPLACE_CITIES,
  type MarketplaceCity,
} from "@/data/locations";
import {
  getActiveUserCoordinates,
  getSavedZipCoordinates,
  getZipPlaceDisplayName,
  loadSavedZipCode,
} from "@/lib/user-location-storage";
import {
  DEFAULT_EXPLORE_RADIUS_MILES,
  DEFAULT_METRO_EXPLORE_RADIUS_MILES,
  EMPTY_TRAINER_FILTERS,
} from "@/lib/explore";
import type { ExploreSearchArea } from "@/lib/explore-map-area";
import {
  MARKETPLACE_CITY_CENTERS,
  marketplaceMetroRadiusMiles,
} from "@/lib/marketplace-city-centers";
import {
  lookupLocalZipCoordinates,
  zipCodeToCoordinates,
} from "@/lib/geo/zip-centroids";
import { getCachedGeocodedZip } from "@/lib/geo/geocoded-zip-cache";
import type { AuthSession } from "@/types/auth";
import type { TrainerFilters } from "@/types";
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
 * ZIP also feeds the default Explore radius via resolveDefaultExploreSearchArea.
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

function getSavedZipExploreFilters(
  session?: AuthSession | null
): TrainerFilters {
  const zip = getEffectiveClientZip(session ?? null) ?? loadSavedZipCode();
  if (!zip) {
    return { ...EMPTY_TRAINER_FILTERS };
  }
  return exploreFiltersFromZipCode(zip);
}

/** Surface saved header/ZIP location on Explore filter chips when unset. */
export function mergeExploreFiltersWithSavedLocation(
  filters: TrainerFilters,
  session?: AuthSession | null
): TrainerFilters {
  if (
    filters.zipCode.trim() ||
    filters.city.trim() ||
    filters.neighborhood.trim()
  ) {
    return filters;
  }

  const saved = getSavedZipExploreFilters(session);
  if (!saved.zipCode && !saved.city && !saved.neighborhood) {
    return filters;
  }

  return {
    ...filters,
    zipCode: saved.zipCode,
    city: saved.city,
    neighborhood: saved.neighborhood,
  };
}

/** True when the client can sort Explore by proximity (header ZIP or GPS). */
export function hasClientSearchLocation(
  session?: AuthSession | null
): boolean {
  if (getEffectiveClientZip(session ?? null) ?? loadSavedZipCode()) {
    return true;
  }
  return getActiveUserCoordinates() != null;
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

function zipExploreOrigin(zip: string): UserGeoPoint | null {
  if (loadSavedZipCode() === zip) {
    const saved = getSavedZipCoordinates();
    if (saved) {
      return { latitude: saved.latitude, longitude: saved.longitude };
    }
  }
  const fromZip =
    zipCodeToCoordinates(zip) ??
    lookupLocalZipCoordinates(zip) ??
    getCachedGeocodedZip(zip);
  if (fromZip) {
    return { latitude: fromZip.latitude, longitude: fromZip.longitude };
  }
  return null;
}

function metroSearchAreaForCity(city: MarketplaceCity): ExploreSearchArea {
  const center = MARKETPLACE_CITY_CENTERS[city];
  return {
    latitude: center.lat,
    longitude: center.lng,
    radiusMiles: marketplaceMetroRadiusMiles(city),
  };
}

/**
 * Default Explore map frame: ZIP / GPS stay local (~12 mi); marketplace city
 * or neighborhood searches use a metro radius so northern / outer areas
 * (e.g. Mira Mesa vs downtown San Diego) stay on the map.
 */
export function resolveDefaultExploreSearchArea(
  filters: TrainerFilters,
  userCoords: UserGeoPoint | null
): ExploreSearchArea | null {
  const zip = normalizeZipCode(filters.zipCode.trim());
  if (isValidZipCode(zip)) {
    const origin = zipExploreOrigin(zip);
    if (origin) {
      return {
        ...origin,
        radiusMiles: DEFAULT_EXPLORE_RADIUS_MILES,
      };
    }
  }

  const city = filters.city.trim();
  if (city && isMarketplaceCity(city)) {
    return metroSearchAreaForCity(city as MarketplaceCity);
  }

  const neighborhood = filters.neighborhood.trim();
  if (neighborhood) {
    const parent = findParentCityForNeighborhood(neighborhood);
    if (parent && isMarketplaceCity(parent)) {
      return metroSearchAreaForCity(parent);
    }
  }

  if (city) {
    const known = SEARCH_CITY_CENTERS[city];
    if (known) {
      return {
        ...known,
        radiusMiles: DEFAULT_METRO_EXPLORE_RADIUS_MILES,
      };
    }
  }

  if (userCoords) {
    return {
      ...userCoords,
      radiusMiles: DEFAULT_EXPLORE_RADIUS_MILES,
    };
  }

  return null;
}

/**
 * Map / radius center for Explore (read-only display + default-mile filter).
 * Prefer filter ZIP centroid (requested area), then city / neighborhood /
 * device coords. Precise GPS is for the purple dot only — not required here.
 */
export function resolveExploreMapArea(
  filters: TrainerFilters,
  userCoords: UserGeoPoint | null
): UserGeoPoint | null {
  const area = resolveDefaultExploreSearchArea(filters, userCoords);
  if (!area) return null;
  return { latitude: area.latitude, longitude: area.longitude };
}

import { getEffectiveClientZip } from "@/lib/client-profile-location";
import {
  CITY_NEIGHBORHOODS,
  isMarketplaceCity,
  MARKETPLACE_CITIES,
} from "@/data/locations";
import {
  getZipPlaceDisplayName,
  loadSavedZipCode,
} from "@/lib/user-location-storage";
import { EMPTY_TRAINER_FILTERS } from "@/lib/explore";
import type { AuthSession } from "@/types/auth";
import type { Trainer, TrainerFilters } from "@/types";
import { providerMatchesNeighborhood } from "@/lib/provider-location";
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
 * Location match for Explore:
 * - Client ZIP never excludes — proximity sort handles “near you”
 * - Explicit city / neighborhood (search parse or filter drawer) still narrows
 */
export function trainerMatchesExploreLocation(
  trainer: Trainer,
  filters: TrainerFilters
): boolean {
  const city = filters.city.trim();
  const neighborhood = filters.neighborhood.trim();

  if (!city && !neighborhood) {
    return true;
  }

  if (neighborhood && providerMatchesNeighborhood(trainer, neighborhood)) {
    return true;
  }

  if (city && trainer.city.trim() === city) {
    return true;
  }

  return false;
}

/** True when the client can sort Explore by proximity. */
export function hasClientSearchLocation(
  session?: AuthSession | null
): boolean {
  return Boolean(getEffectiveClientZip(session ?? null) ?? loadSavedZipCode());
}

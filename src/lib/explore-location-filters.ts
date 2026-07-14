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
import { haversineMiles } from "@/lib/geo/haversine";
import { zipCodeToCoordinates } from "@/lib/geo/zip-centroids";
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
 * Explore filter seeds from the user's saved preferred ZIP (header location).
 * Never uses marketplace-city guessing or hardcoded defaults.
 */
/** Build explore location filters from any 5-digit ZIP (saved or filter drawer). */
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

/** Merge profile or saved ZIP location into filters without overwriting explicit user choices */
export function mergeExploreFiltersWithSavedLocation(
  filters: TrainerFilters,
  session?: AuthSession | null
): TrainerFilters {
  const saved = getSavedZipExploreFilters(session);
  if (!saved.zipCode) {
    return filters;
  }

  return {
    ...filters,
    zipCode: filters.zipCode || saved.zipCode,
    city: filters.city || saved.city,
    neighborhood: filters.neighborhood || saved.neighborhood,
  };
}

export function hasExploreLocationFilters(filters: TrainerFilters): boolean {
  return Boolean(filters.zipCode || filters.city || filters.neighborhood);
}

function trainerOffersTravel(trainer: Trainer): boolean {
  if (trainer.willingToTravel != null) {
    return trainer.willingToTravel;
  }
  return (
    trainer.serviceType === "in-person" ||
    trainer.serviceType === "both" ||
    (trainer.serviceRadiusMiles ?? 0) > 0
  );
}

/**
 * Location match for Explore: ZIP first, then neighborhood, then city.
 * TODO(proximity-matching): When user ZIP and specialist willingToTravel are set,
 * include specialists whose serviceRadiusMiles covers haversine distance to user.
 */
export function trainerMatchesExploreLocation(
  trainer: Trainer,
  filters: TrainerFilters
): boolean {
  const zip = filters.zipCode.trim();
  const city = filters.city.trim();
  const neighborhood = filters.neighborhood.trim();

  if (!zip && !city && !neighborhood) {
    return true;
  }

  if (zip && trainer.zipCode.trim() === zip) {
    return true;
  }

  if (zip && trainer.serviceAreaZipCodes?.includes(zip)) {
    return true;
  }

  if (zip) {
    const specialistCoords =
      trainer.latitude != null && trainer.longitude != null
        ? { latitude: trainer.latitude, longitude: trainer.longitude }
        : zipCodeToCoordinates(trainer.zipCode);
    const userFromZip = zipCodeToCoordinates(zip);

    if (userFromZip && specialistCoords && trainerOffersTravel(trainer)) {
      const radius = trainer.serviceRadiusMiles ?? 0;
      if (radius > 0) {
        const distance = haversineMiles(
          userFromZip.latitude,
          userFromZip.longitude,
          specialistCoords.latitude,
          specialistCoords.longitude
        );
        if (distance <= radius) {
          return true;
        }
      }
    }
  }

  if (neighborhood && providerMatchesNeighborhood(trainer, neighborhood)) {
    return true;
  }

  if (city && trainer.city.trim() === city) {
    return true;
  }

  return false;
}

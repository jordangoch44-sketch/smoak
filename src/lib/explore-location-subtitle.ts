import { lookupLocalZipPlace } from "@/lib/geo/zip-place-names";
import { getEffectiveClientZip } from "@/lib/client-profile-location";
import {
  getZipPlaceDisplayName,
  loadSavedZipCode,
} from "@/lib/user-location-storage";
import type { AuthSession } from "@/types/auth";
import type { TrainerFilters } from "@/types";

/**
 * Quiet location line under Explore title — never marketing copy.
 * Prefer active filters, then profile/saved ZIP place name.
 */
export function getExploreLocationSubtitle(options: {
  filters: TrainerFilters;
  session: AuthSession | null;
  searchQuery?: string;
}): string {
  const { filters, session, searchQuery = "" } = options;
  const trimmedQuery = searchQuery.trim();

  const neighborhood = filters.neighborhood.trim();
  const city = filters.city.trim();
  if (neighborhood && city) {
    return `Showing specialists near ${neighborhood}, ${city}`;
  }
  if (neighborhood) {
    return `Showing specialists near ${neighborhood}`;
  }
  if (city) {
    return `Showing specialists near ${city}`;
  }

  const zip =
    filters.zipCode.trim() ||
    getEffectiveClientZip(session) ||
    loadSavedZipCode() ||
    "";

  if (zip) {
    const local = lookupLocalZipPlace(zip);
    const place =
      local?.placeName || getZipPlaceDisplayName(zip) || "";
    const state = local?.state?.trim() || "";
    if (place && state) {
      return `Showing specialists near ${place}, ${state}`;
    }
    if (place) {
      return `Showing specialists near ${place}`;
    }
  }

  if (trimmedQuery) {
    return `Showing results for “${trimmedQuery}”`;
  }

  return "Showing specialists within 10 miles";
}

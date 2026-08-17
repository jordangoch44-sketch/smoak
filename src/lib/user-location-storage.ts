import type { GeoCoordinates } from "@/lib/geo/zip-centroids";
import { getCachedGeocodedZip } from "@/lib/geo/geocoded-zip-cache";
import {
  lookupLocalZipCoordinates,
  zipCodeToCoordinates,
} from "@/lib/geo/zip-centroids";
import { getCachedGeocodedZipPlace } from "@/lib/geo/geocoded-zip-cache";
import { findNearestMarketplaceCity } from "@/lib/marketplace-city-centers";
import {
  lookupLocalZipPlace,
  UNKNOWN_ZIP_AREA_LABEL,
} from "@/lib/geo/zip-place-names";
import {
  isValidZipCode,
  normalizeZipCode,
} from "@/lib/zip-to-marketplace-city";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";

export const USER_LATITUDE_KEY = "userLatitude";
export const USER_LONGITUDE_KEY = "userLongitude";
export const USER_ZIP_LATITUDE_KEY = "userZipLatitude";
export const USER_ZIP_LONGITUDE_KEY = "userZipLongitude";
export const HAS_LOCATION_PERMISSION_KEY = "hasLocationPermission";
export const USER_ZIP_CODE_KEY = "userZipCode";
export const USER_ZIP_PLACE_NAME_KEY = "userZipPlaceName";
export const USER_ZIP_STATE_KEY = "userZipState";
export const HAS_SKIPPED_LOCATION_PROMPT_KEY = "hasSkippedLocationPrompt";

export const USER_LOCATION_CHANGE_EVENT = "smoac-user-location-change";

function dispatchUserLocationChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(USER_LOCATION_CHANGE_EVENT));
}

function readNumber(key: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

export function loadSavedCoordinates(): {
  latitude: number;
  longitude: number;
} | null {
  const latitude = readNumber(USER_LATITUDE_KEY);
  const longitude = readNumber(USER_LONGITUDE_KEY);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

export function hasSavedGeolocation(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(HAS_LOCATION_PERMISSION_KEY) === "true" &&
    loadSavedCoordinates() !== null
  );
}

export function loadSavedZipCode(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_ZIP_CODE_KEY);
  if (!raw) return null;
  const zip = normalizeZipCode(raw);
  return isValidZipCode(zip) ? zip : null;
}

export function loadSavedZipPlaceName(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_ZIP_PLACE_NAME_KEY);
  return raw?.trim() || null;
}

/** Display label for header + copy — never mismatched with a different ZIP */
export function getZipPlaceDisplayName(zip: string): string | null {
  const local = lookupLocalZipPlace(zip);
  if (local) return local.placeName;

  if (loadSavedZipCode() === zip) {
    const saved = loadSavedZipPlaceName();
    if (saved) return saved;

    const cached = getCachedGeocodedZipPlace(zip);
    if (cached?.placeName) return cached.placeName;
  }

  return null;
}

export { UNKNOWN_ZIP_AREA_LABEL } from "@/lib/geo/zip-place-names";

export function hasSkippedLocationPrompt(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(HAS_SKIPPED_LOCATION_PROMPT_KEY) === "true";
}

/** True when the homepage location modal should still be offered. */
export function shouldShowLocationPrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (hasSkippedLocationPrompt()) return false;
  if (loadSavedZipCode()) return false;
  if (hasSavedGeolocation()) return false;
  return true;
}

/**
 * Search-page location popup. Marketplace stays ungated.
 * Skippable — IP still frames Search when ZIP / GPS are declined.
 */
export function needsSiteLocationGate(): boolean {
  return shouldShowLocationPrompt();
}

export function hasPersonalizationLocation(): boolean {
  return getPersonalizationCity() !== null;
}

function coordinatesForSavedZip(zip: string): GeoCoordinates | null {
  const zipLat = readNumber(USER_ZIP_LATITUDE_KEY);
  const zipLng = readNumber(USER_ZIP_LONGITUDE_KEY);
  if (zipLat !== null && zipLng !== null) {
    return { latitude: zipLat, longitude: zipLng };
  }
  return (
    lookupLocalZipCoordinates(zip) ??
    getCachedGeocodedZip(zip) ??
    zipCodeToCoordinates(zip)
  );
}

/**
 * Resolved place label for display (header, homepage copy).
 * Prefer ZIP/neighborhood label; fall back to nearest marketplace city from GPS.
 */
export function getPersonalizationCity(): string | null {
  const zip = loadSavedZipCode();
  if (zip) {
    return getZipPlaceDisplayName(zip) ?? loadSavedZipPlaceName();
  }

  const coords = loadSavedCoordinates();
  if (coords && hasSavedGeolocation()) {
    return findNearestMarketplaceCity(coords.latitude, coords.longitude);
  }

  return null;
}

/** Marketplace metro bucket for rankings slug / explore city filter — from coordinates only */
export function getPersonalizationMarketplaceCity(): string | null {
  const coords = getActiveUserCoordinates();
  if (!coords) return null;
  return findNearestMarketplaceCity(coords.latitude, coords.longitude);
}

export function saveGeolocationCoordinates(
  latitude: number,
  longitude: number,
  resolved?: {
    zip?: string | null;
    placeName?: string | null;
    state?: string | null;
  }
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_LATITUDE_KEY, String(latitude));
  window.localStorage.setItem(USER_LONGITUDE_KEY, String(longitude));
  window.localStorage.setItem(HAS_LOCATION_PERMISSION_KEY, "true");
  window.localStorage.removeItem(HAS_SKIPPED_LOCATION_PROMPT_KEY);

  const zip = resolved?.zip ? normalizeZipCode(resolved.zip) : "";
  if (zip && isValidZipCode(zip)) {
    window.localStorage.setItem(USER_ZIP_CODE_KEY, zip);
    const placeName = resolved?.placeName?.trim() ?? "";
    if (placeName) {
      window.localStorage.setItem(USER_ZIP_PLACE_NAME_KEY, placeName);
    } else {
      window.localStorage.removeItem(USER_ZIP_PLACE_NAME_KEY);
    }
    const state = resolved?.state?.trim() ?? "";
    if (state) {
      window.localStorage.setItem(USER_ZIP_STATE_KEY, state);
    } else {
      window.localStorage.removeItem(USER_ZIP_STATE_KEY);
    }
    /* Keep device coords as the proximity source of truth; ZIP is for labels/filters */
    window.localStorage.setItem(USER_ZIP_LATITUDE_KEY, String(latitude));
    window.localStorage.setItem(USER_ZIP_LONGITUDE_KEY, String(longitude));
  } else {
    window.localStorage.removeItem(USER_ZIP_CODE_KEY);
    window.localStorage.removeItem(USER_ZIP_PLACE_NAME_KEY);
    window.localStorage.removeItem(USER_ZIP_STATE_KEY);
    window.localStorage.removeItem(USER_ZIP_LATITUDE_KEY);
    window.localStorage.removeItem(USER_ZIP_LONGITUDE_KEY);
  }

  dispatchUserLocationChange();
}

export interface SaveUserZipOptions {
  coordinates?: GeoCoordinates | null;
  placeName?: string | null;
  state?: string | null;
}

export function saveUserZipCode(
  zip: string,
  options?: SaveUserZipOptions | GeoCoordinates | null
): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeZipCode(zip);
  if (!isValidZipCode(normalized)) return;

  const opts: SaveUserZipOptions =
    options && "latitude" in options
      ? { coordinates: options }
      : (options ?? {});

  window.localStorage.setItem(USER_ZIP_CODE_KEY, normalized);
  /*
   * ZIP updates search framing / labels only. Never clear device GPS —
   * the purple map dot stays when the user already allowed precise location.
   */

  const placeName = opts.placeName?.trim() ?? "";
  if (placeName) {
    window.localStorage.setItem(USER_ZIP_PLACE_NAME_KEY, placeName);
  } else {
    window.localStorage.removeItem(USER_ZIP_PLACE_NAME_KEY);
  }

  const state = opts.state?.trim() ?? "";
  if (state) {
    window.localStorage.setItem(USER_ZIP_STATE_KEY, state);
  } else {
    window.localStorage.removeItem(USER_ZIP_STATE_KEY);
  }

  const centroid =
    opts.coordinates ??
    lookupLocalZipCoordinates(normalized) ??
    getCachedGeocodedZip(normalized);

  if (
    centroid &&
    Number.isFinite(centroid.latitude) &&
    Number.isFinite(centroid.longitude)
  ) {
    window.localStorage.setItem(
      USER_ZIP_LATITUDE_KEY,
      String(centroid.latitude)
    );
    window.localStorage.setItem(
      USER_ZIP_LONGITUDE_KEY,
      String(centroid.longitude)
    );
  } else {
    window.localStorage.removeItem(USER_ZIP_LATITUDE_KEY);
    window.localStorage.removeItem(USER_ZIP_LONGITUDE_KEY);
  }
  window.localStorage.removeItem(HAS_SKIPPED_LOCATION_PROMPT_KEY);
  dispatchUserLocationChange();
}

/** ZIP search-area centroid (not device GPS). */
export function getSavedZipCoordinates(): GeoCoordinates | null {
  const zipLat = readNumber(USER_ZIP_LATITUDE_KEY);
  const zipLng = readNumber(USER_ZIP_LONGITUDE_KEY);
  if (zipLat !== null && zipLng !== null) {
    return { latitude: zipLat, longitude: zipLng };
  }
  const zip = loadSavedZipCode();
  if (!zip) return null;
  return coordinatesForSavedZip(zip);
}

/** Active coordinates for proximity sorting — device geo or ZIP centroid */
export function getActiveUserCoordinates(): UserGeoPoint | null {
  const geo = loadSavedCoordinates();
  if (geo && hasSavedGeolocation()) {
    return { latitude: geo.latitude, longitude: geo.longitude };
  }

  const zipLat = readNumber(USER_ZIP_LATITUDE_KEY);
  const zipLng = readNumber(USER_ZIP_LONGITUDE_KEY);
  if (zipLat !== null && zipLng !== null) {
    return { latitude: zipLat, longitude: zipLng };
  }

  const zip = loadSavedZipCode();
  if (zip) {
    return coordinatesForSavedZip(zip);
  }

  return null;
}

export function markLocationPromptSkipped(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HAS_SKIPPED_LOCATION_PROMPT_KEY, "true");
  dispatchUserLocationChange();
}

/** Clear saved ZIP location (e.g. on client logout — profile is source of truth on next login). */
export function clearSavedUserZipLocation(): void {
  clearUserLocation();
}

/**
 * Clear all personalization location (ZIP labels + device/ZIP coordinates).
 * Header returns to “Enter ZIP”; Explore proximity has no origin until set again.
 */
export function clearUserLocation(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_ZIP_CODE_KEY);
  window.localStorage.removeItem(USER_ZIP_PLACE_NAME_KEY);
  window.localStorage.removeItem(USER_ZIP_STATE_KEY);
  window.localStorage.removeItem(USER_ZIP_LATITUDE_KEY);
  window.localStorage.removeItem(USER_ZIP_LONGITUDE_KEY);
  window.localStorage.removeItem(USER_LATITUDE_KEY);
  window.localStorage.removeItem(USER_LONGITUDE_KEY);
  window.localStorage.removeItem(HAS_LOCATION_PERMISSION_KEY);
  dispatchUserLocationChange();
}

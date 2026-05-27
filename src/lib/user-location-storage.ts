import { findNearestMarketplaceCity } from "@/lib/marketplace-city-centers";
import {
  isValidZipCode,
  normalizeZipCode,
  zipCodeToMarketplaceCity,
} from "@/lib/zip-to-marketplace-city";

export const USER_LATITUDE_KEY = "userLatitude";
export const USER_LONGITUDE_KEY = "userLongitude";
export const HAS_LOCATION_PERMISSION_KEY = "hasLocationPermission";
export const USER_ZIP_CODE_KEY = "userZipCode";
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

export function hasPersonalizationLocation(): boolean {
  return getPersonalizationCity() !== null;
}

/** Resolved marketplace city from saved geo or ZIP. */
export function getPersonalizationCity(): string | null {
  const zip = loadSavedZipCode();
  if (zip) return zipCodeToMarketplaceCity(zip);

  const coords = loadSavedCoordinates();
  if (coords && hasSavedGeolocation()) {
    return findNearestMarketplaceCity(coords.latitude, coords.longitude);
  }

  return null;
}

export function saveGeolocationCoordinates(
  latitude: number,
  longitude: number
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_LATITUDE_KEY, String(latitude));
  window.localStorage.setItem(USER_LONGITUDE_KEY, String(longitude));
  window.localStorage.setItem(HAS_LOCATION_PERMISSION_KEY, "true");
  window.localStorage.removeItem(USER_ZIP_CODE_KEY);
  window.localStorage.removeItem(HAS_SKIPPED_LOCATION_PROMPT_KEY);
  dispatchUserLocationChange();
}

export function saveUserZipCode(zip: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeZipCode(zip);
  if (!isValidZipCode(normalized)) return;
  window.localStorage.setItem(USER_ZIP_CODE_KEY, normalized);
  window.localStorage.removeItem(USER_LATITUDE_KEY);
  window.localStorage.removeItem(USER_LONGITUDE_KEY);
  window.localStorage.removeItem(HAS_LOCATION_PERMISSION_KEY);
  window.localStorage.removeItem(HAS_SKIPPED_LOCATION_PROMPT_KEY);
  dispatchUserLocationChange();
}

export function markLocationPromptSkipped(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HAS_SKIPPED_LOCATION_PROMPT_KEY, "true");
  dispatchUserLocationChange();
}

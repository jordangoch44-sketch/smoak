import { lookupLocalZipCoordinates } from "@/lib/geo/zip-centroids";
import { lookupLocalZipPlace } from "@/lib/geo/zip-place-names";
import { reverseGeocodeCoordinates } from "@/lib/geo/reverse-geocode";
import { resolveZipLocation } from "@/lib/geo/resolve-zip-location";
import { recordRecentZipCode } from "@/lib/recent-zip-storage";
import {
  isValidZipCode,
  normalizeZipCode,
} from "@/lib/zip-to-marketplace-city";
import {
  getPersonalizationCity,
  getPersonalizationMarketplaceCity,
  loadSavedZipCode,
  markLocationPromptSkipped,
  saveGeolocationCoordinates,
  saveUserZipCode,
  shouldShowLocationPrompt,
  USER_LOCATION_CHANGE_EVENT,
} from "@/lib/user-location-storage";

export {
  getPersonalizationCity,
  getPersonalizationMarketplaceCity,
  hasPersonalizationLocation,
  hasSavedGeolocation,
  hasSkippedLocationPrompt,
  loadSavedCoordinates,
  loadSavedZipCode,
  markLocationPromptSkipped,
  saveGeolocationCoordinates,
  saveUserZipCode,
  shouldShowLocationPrompt,
} from "@/lib/user-location-storage";

export function subscribeUserLocation(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onStoreChange();
  window.addEventListener(USER_LOCATION_CHANGE_EVENT, handler);
  return () => window.removeEventListener(USER_LOCATION_CHANGE_EVENT, handler);
}

export function getShouldShowLocationPromptSnapshot(): boolean {
  return shouldShowLocationPrompt();
}

export function getPersonalizationCitySnapshot(): string | null {
  return getPersonalizationCity();
}

export function getPersonalizationMarketplaceCitySnapshot(): string | null {
  return getPersonalizationMarketplaceCity();
}

export function getPersonalizationMarketplaceCityServerSnapshot(): string | null {
  return null;
}

export function getPersonalizationCityServerSnapshot(): string | null {
  return null;
}

export function getUserZipSnapshot(): string | null {
  return loadSavedZipCode();
}

export function getUserZipServerSnapshot(): string | null {
  return null;
}

export {
  getActiveUserCoordinatesSnapshot,
  getActiveUserCoordinatesServerSnapshot,
  getActiveUserCoordinatesKeySnapshot,
  getActiveUserCoordinatesKeyServerSnapshot,
} from "@/lib/user-location-snapshots";

export function getShouldShowLocationPromptServerSnapshot(): boolean {
  return false;
}

export function completeGeolocation(latitude: number, longitude: number): void {
  saveGeolocationCoordinates(latitude, longitude);
}

export type CompleteGeolocationResult =
  | { ok: true; zip: string | null; placeName: string | null }
  | { ok: false; message: string };

/**
 * High-accuracy GPS → reverse geocode → persist device coords + ZIP/place.
 * Device coordinates remain the proximity sort source of truth.
 */
export async function completeGeolocationAsync(
  latitude: number,
  longitude: number
): Promise<CompleteGeolocationResult> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, message: "Location is unavailable on this device." };
  }

  const resolved = await reverseGeocodeCoordinates(latitude, longitude);
  saveGeolocationCoordinates(latitude, longitude, {
    zip: resolved?.zip ?? null,
    placeName: resolved?.placeName ?? null,
    state: resolved?.state ?? null,
  });

  if (resolved?.zip) {
    recordRecentZipCode(resolved.zip);
  }

  return {
    ok: true,
    zip: resolved?.zip ?? null,
    placeName: resolved?.placeName ?? null,
  };
}

export function completeZipEntry(zip: string): void {
  const normalized = normalizeZipCode(zip);
  if (!isValidZipCode(normalized)) return;
  const local = lookupLocalZipPlace(normalized);
  saveUserZipCode(normalized, {
    coordinates: lookupLocalZipCoordinates(normalized),
    placeName: local?.placeName ?? null,
    state: local?.state ?? null,
  });
  recordRecentZipCode(normalized);
}

export type CompleteZipEntryResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Validate ZIP, resolve coordinates (local DB → geocode fallback), persist, and notify listeners.
 */
export async function completeZipEntryAsync(
  zip: string
): Promise<CompleteZipEntryResult> {
  const resolved = await resolveZipLocation(zip);
  if (!resolved.ok) {
    return { ok: false, message: resolved.message };
  }

  saveUserZipCode(resolved.zip, {
    coordinates: resolved.coordinates,
    placeName: resolved.placeName,
    state: resolved.state,
  });
  recordRecentZipCode(resolved.zip);
  return { ok: true };
}

export function skipLocationPrompt(): void {
  markLocationPromptSkipped();
}

import {
  getPersonalizationCity,
  markLocationPromptSkipped,
  saveGeolocationCoordinates,
  saveUserZipCode,
  shouldShowLocationPrompt,
  USER_LOCATION_CHANGE_EVENT,
} from "@/lib/user-location-storage";

export {
  getPersonalizationCity,
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

export function getPersonalizationCityServerSnapshot(): string | null {
  return null;
}

export function getShouldShowLocationPromptServerSnapshot(): boolean {
  return false;
}

export function completeGeolocation(latitude: number, longitude: number): void {
  saveGeolocationCoordinates(latitude, longitude);
}

export function completeZipEntry(zip: string): void {
  saveUserZipCode(zip);
}

export function skipLocationPrompt(): void {
  markLocationPromptSkipped();
}

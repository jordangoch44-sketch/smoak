import {
  lookupLocalZipCoordinates,
  zipCodeToCoordinates,
} from "@/lib/geo/zip-centroids";
import { lookupLocalZipPlace } from "@/lib/geo/zip-place-names";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import {
  completeZipEntry,
  completeZipEntryAsync,
} from "@/lib/user-location-store";
import {
  getActiveUserCoordinates,
  loadSavedZipCode,
  saveUserZipCode,
} from "@/lib/user-location-storage";
import {
  isValidZipCode,
  normalizeZipCode,
} from "@/lib/zip-to-marketplace-city";
import type { AuthSession } from "@/types/auth";

/** Valid ZIP from a signed-in client session (profiles.client_zip_code). */
export function getProfileZipFromSession(
  session: AuthSession | null | undefined
): string | null {
  if (!session || session.role !== "client") return null;
  const zip = normalizeZipCode(session.clientZipCode?.trim() ?? "");
  return isValidZipCode(zip) ? zip : null;
}

/**
 * ZIP for UI + explore: profile wins for signed-in clients; otherwise localStorage.
 * Never falls back to hardcoded defaults.
 */
export function getEffectiveClientZip(
  session: AuthSession | null | undefined
): string | null {
  const profileZip = getProfileZipFromSession(session);
  if (profileZip) return profileZip;
  return loadSavedZipCode();
}

/** Coordinates for proximity sort — profile ZIP wins for signed-in clients. */
export function getEffectiveUserCoordinates(
  session: AuthSession | null | undefined
): UserGeoPoint | null {
  const profileZip = getProfileZipFromSession(session);
  if (profileZip) {
    const coords =
      lookupLocalZipCoordinates(profileZip) ??
      zipCodeToCoordinates(profileZip);
    if (coords) return coords;
  }
  return getActiveUserCoordinates();
}

/**
 * Persist profile ZIP into localStorage so explore proximity + legacy listeners stay in sync.
 * Overwrites stale guest ZIP when the signed-in profile differs.
 */
export async function syncLocalStorageFromProfileZip(
  session: AuthSession
): Promise<void> {
  if (session.role !== "client") return;

  const zip = getProfileZipFromSession(session);
  if (!zip) return;

  const stored = loadSavedZipCode();
  const cityHint = session.clientCity?.trim() ?? "";
  const local = lookupLocalZipPlace(zip);

  if (stored === zip && local?.placeName) {
    return;
  }

  if (lookupLocalZipCoordinates(zip)) {
    completeZipEntry(zip);
    return;
  }

  const resolved = await completeZipEntryAsync(zip);
  if (resolved.ok) return;

  saveUserZipCode(zip, {
    placeName: cityHint || local?.placeName || null,
    state: local?.state ?? null,
  });
}

/** @alias syncLocalStorageFromProfileZip — used after signup/login/session restore */
export const hydrateClientLocationFromSession = syncLocalStorageFromProfileZip;

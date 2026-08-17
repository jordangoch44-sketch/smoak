/**
 * Coarse IP location for Marketplace rails and Search map fallback.
 * Never written as a ZIP / GPS permission — those stay opt-in.
 */

import { USER_LOCATION_CHANGE_EVENT } from "@/lib/user-location-storage";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";

export const IP_LOCATION_HINT_STORAGE_KEY = "smoac-ip-location-hint";

export type IpLocationHint = {
  city: string | null;
  marketplaceCity: string | null;
  latitude: number | null;
  longitude: number | null;
};

function notifyLocationListeners(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(USER_LOCATION_CHANGE_EVENT));
}

export function readIpLocationHint(): IpLocationHint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(IP_LOCATION_HINT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IpLocationHint;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeIpLocationHint(hint: IpLocationHint): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      IP_LOCATION_HINT_STORAGE_KEY,
      JSON.stringify(hint)
    );
  } catch {
    /* private mode */
  }
  notifyLocationListeners();
}

export function getIpPersonalizationCity(): string | null {
  const hint = readIpLocationHint();
  const city = hint?.marketplaceCity?.trim() || hint?.city?.trim() || "";
  return city || null;
}

let cachedIpCoords: UserGeoPoint | null = null;
let cachedIpLat: number | null = null;
let cachedIpLng: number | null = null;

export function getIpUserCoordinates(): UserGeoPoint | null {
  const hint = readIpLocationHint();
  if (
    hint?.latitude == null ||
    hint?.longitude == null ||
    !Number.isFinite(hint.latitude) ||
    !Number.isFinite(hint.longitude)
  ) {
    cachedIpCoords = null;
    cachedIpLat = null;
    cachedIpLng = null;
    return null;
  }

  if (
    cachedIpCoords &&
    cachedIpLat === hint.latitude &&
    cachedIpLng === hint.longitude
  ) {
    return cachedIpCoords;
  }

  cachedIpLat = hint.latitude;
  cachedIpLng = hint.longitude;
  cachedIpCoords = {
    latitude: hint.latitude,
    longitude: hint.longitude,
  };
  return cachedIpCoords;
}

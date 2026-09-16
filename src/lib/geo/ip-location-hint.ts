/**
 * Coarse IP location for Marketplace rails and Search map fallback.
 * Never written as a ZIP / GPS permission — those stay opt-in.
 * Coords are ignored unless they land in the live San Diego–area market.
 */

import { USER_LOCATION_CHANGE_EVENT } from "@/lib/user-location-storage";
import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import {
  DEFAULT_MARKETPLACE_CITY,
  findNearbyLiveMarketplaceCity,
  isLiveMarketplaceCity,
} from "@/lib/marketplace-city-centers";

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

function liveCoordinatesFromHint(hint: IpLocationHint | null): UserGeoPoint | null {
  if (
    hint?.latitude == null ||
    hint?.longitude == null ||
    !Number.isFinite(hint.latitude) ||
    !Number.isFinite(hint.longitude)
  ) {
    return null;
  }
  if (!findNearbyLiveMarketplaceCity(hint.latitude, hint.longitude)) return null;
  return { latitude: hint.latitude, longitude: hint.longitude };
}

export function ipHintHasLiveCoordinates(hint: IpLocationHint | null): boolean {
  return liveCoordinatesFromHint(hint) != null;
}

/** Cached hint is safe to keep — live coords, or the San Diego city fallback. */
export function ipHintIsTrusted(hint: IpLocationHint | null): boolean {
  if (!hint) return false;
  if (ipHintHasLiveCoordinates(hint)) return true;
  return (
    hint.marketplaceCity === DEFAULT_MARKETPLACE_CITY &&
    hint.latitude == null &&
    hint.longitude == null
  );
}

export function getIpPersonalizationCity(): string | null {
  const hint = readIpLocationHint();
  const labeled = hint?.marketplaceCity?.trim() || hint?.city?.trim() || "";
  if (isLiveMarketplaceCity(labeled)) return labeled;
  if (
    hint?.latitude != null &&
    hint?.longitude != null &&
    Number.isFinite(hint.latitude) &&
    Number.isFinite(hint.longitude)
  ) {
    return findNearbyLiveMarketplaceCity(hint.latitude, hint.longitude);
  }
  return null;
}

let cachedIpCoords: UserGeoPoint | null = null;
let cachedIpLat: number | null = null;
let cachedIpLng: number | null = null;

export function getIpUserCoordinates(): UserGeoPoint | null {
  const next = liveCoordinatesFromHint(readIpLocationHint());
  if (!next) {
    cachedIpCoords = null;
    cachedIpLat = null;
    cachedIpLng = null;
    return null;
  }

  if (
    cachedIpCoords &&
    cachedIpLat === next.latitude &&
    cachedIpLng === next.longitude
  ) {
    return cachedIpCoords;
  }

  cachedIpLat = next.latitude;
  cachedIpLng = next.longitude;
  cachedIpCoords = next;
  return cachedIpCoords;
}

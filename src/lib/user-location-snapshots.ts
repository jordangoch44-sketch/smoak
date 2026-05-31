import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import { getActiveUserCoordinates } from "@/lib/user-location-storage";

/** Cached snapshot — useSyncExternalStore requires stable object identity */
let cachedCoords: UserGeoPoint | null = null;
let cachedLat: number | null = null;
let cachedLng: number | null = null;
let cachedCoordsKey: string | null = null;

function buildCoordsKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function getActiveUserCoordinatesSnapshot(): UserGeoPoint | null {
  const next = getActiveUserCoordinates();

  if (next === null) {
    if (cachedCoords === null) return null;
    cachedCoords = null;
    cachedLat = null;
    cachedLng = null;
    cachedCoordsKey = null;
    return null;
  }

  if (
    cachedCoords !== null &&
    cachedLat === next.latitude &&
    cachedLng === next.longitude
  ) {
    return cachedCoords;
  }

  cachedLat = next.latitude;
  cachedLng = next.longitude;
  cachedCoords = { latitude: cachedLat, longitude: cachedLng };
  cachedCoordsKey = buildCoordsKey(cachedLat, cachedLng);
  return cachedCoords;
}

/** Stable primitive for useMemo / effect dependencies */
export function getActiveUserCoordinatesKeySnapshot(): string | null {
  getActiveUserCoordinatesSnapshot();
  return cachedCoordsKey;
}

export function getActiveUserCoordinatesServerSnapshot(): UserGeoPoint | null {
  return null;
}

export function getActiveUserCoordinatesKeyServerSnapshot(): string | null {
  return null;
}

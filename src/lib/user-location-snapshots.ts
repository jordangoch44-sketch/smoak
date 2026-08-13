import type { UserGeoPoint } from "@/lib/trainer-proximity-sort";
import {
  getActiveUserCoordinates,
  hasSavedGeolocation,
  loadSavedCoordinates,
} from "@/lib/user-location-storage";

/** Cached snapshot — useSyncExternalStore requires stable object identity */
let cachedCoords: UserGeoPoint | null = null;
let cachedLat: number | null = null;
let cachedLng: number | null = null;
let cachedCoordsKey: string | null = null;

let cachedPrecise: UserGeoPoint | null = null;
let cachedPreciseLat: number | null = null;
let cachedPreciseLng: number | null = null;
let cachedPreciseKey: string | null = null;

function buildCoordsKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function rememberPoint(
  next: UserGeoPoint | null,
  cached: {
    coords: UserGeoPoint | null;
    lat: number | null;
    lng: number | null;
    key: string | null;
  }
): {
  coords: UserGeoPoint | null;
  lat: number | null;
  lng: number | null;
  key: string | null;
  value: UserGeoPoint | null;
} {
  if (next === null) {
    return {
      coords: null,
      lat: null,
      lng: null,
      key: null,
      value: null,
    };
  }

  if (
    cached.coords !== null &&
    cached.lat === next.latitude &&
    cached.lng === next.longitude
  ) {
    return {
      coords: cached.coords,
      lat: cached.lat,
      lng: cached.lng,
      key: cached.key,
      value: cached.coords,
    };
  }

  const lat = next.latitude;
  const lng = next.longitude;
  const coords = { latitude: lat, longitude: lng };
  return {
    coords,
    lat,
    lng,
    key: buildCoordsKey(lat, lng),
    value: coords,
  };
}

export function getActiveUserCoordinatesSnapshot(): UserGeoPoint | null {
  const next = getActiveUserCoordinates();
  const remembered = rememberPoint(next, {
    coords: cachedCoords,
    lat: cachedLat,
    lng: cachedLng,
    key: cachedCoordsKey,
  });
  cachedCoords = remembered.coords;
  cachedLat = remembered.lat;
  cachedLng = remembered.lng;
  cachedCoordsKey = remembered.key;
  return remembered.value;
}

/** Device GPS only — never ZIP / city centroids (map “you are here” dot). */
export function getPreciseUserCoordinatesSnapshot(): UserGeoPoint | null {
  const geo = hasSavedGeolocation() ? loadSavedCoordinates() : null;
  const next = geo
    ? { latitude: geo.latitude, longitude: geo.longitude }
    : null;

  const remembered = rememberPoint(next, {
    coords: cachedPrecise,
    lat: cachedPreciseLat,
    lng: cachedPreciseLng,
    key: cachedPreciseKey,
  });
  cachedPrecise = remembered.coords;
  cachedPreciseLat = remembered.lat;
  cachedPreciseLng = remembered.lng;
  cachedPreciseKey = remembered.key;
  return remembered.value;
}

export function getPreciseUserCoordinatesKeySnapshot(): string | null {
  getPreciseUserCoordinatesSnapshot();
  return cachedPreciseKey;
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

export function getPreciseUserCoordinatesServerSnapshot(): UserGeoPoint | null {
  return null;
}

export function getPreciseUserCoordinatesKeyServerSnapshot(): string | null {
  return null;
}

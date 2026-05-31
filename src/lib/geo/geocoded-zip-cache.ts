import type { GeoCoordinates } from "@/lib/geo/zip-centroids";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";

const CACHE_KEY = "smoacGeocodedZipCache";

export interface GeocodedZipEntry {
  latitude: number;
  longitude: number;
  placeName: string;
  state: string;
}

type CacheMap = Record<string, GeocodedZipEntry>;

function readCache(): CacheMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(map: CacheMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

export function getCachedGeocodedZipPlace(
  zip: string
): (GeocodedZipEntry & { coordinates: GeoCoordinates }) | null {
  const normalized = normalizeZipCode(zip);
  if (!isValidZipCode(normalized)) return null;
  const hit = readCache()[normalized];
  if (
    hit &&
    Number.isFinite(hit.latitude) &&
    Number.isFinite(hit.longitude)
  ) {
    return {
      ...hit,
      coordinates: { latitude: hit.latitude, longitude: hit.longitude },
    };
  }
  return null;
}

/** @deprecated Prefer getCachedGeocodedZipPlace */
export function getCachedGeocodedZip(zip: string): GeoCoordinates | null {
  const entry = getCachedGeocodedZipPlace(zip);
  return entry?.coordinates ?? null;
}

export function cacheGeocodedZip(
  zip: string,
  coordinates: GeoCoordinates,
  placeName = "",
  state = ""
): void {
  const normalized = normalizeZipCode(zip);
  if (!isValidZipCode(normalized)) return;
  const next = {
    ...readCache(),
    [normalized]: {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      placeName: placeName.trim(),
      state: state.trim().toUpperCase(),
    },
  };
  writeCache(next);
}

export function cacheGeocodedZipPlace(
  zip: string,
  entry: GeocodedZipEntry
): void {
  cacheGeocodedZip(
    zip,
    { latitude: entry.latitude, longitude: entry.longitude },
    entry.placeName,
    entry.state
  );
}

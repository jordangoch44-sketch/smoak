import type { GeoCoordinates } from "@/lib/geo/zip-centroids";
import { lookupLocalZipCoordinates } from "@/lib/geo/zip-centroids";
import { getCachedGeocodedZipPlace } from "@/lib/geo/geocoded-zip-cache";
import { cacheGeocodedZip } from "@/lib/geo/geocoded-zip-cache";
import { geocodeUsZipFallback } from "@/lib/geo/zip-geocode-fallback";
import { fetchZippopotamUsZip } from "@/lib/geo/zippopotam-client";
import {
  lookupLocalZipPlace,
  type ZipPlaceRecord,
} from "@/lib/geo/zip-place-names";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";

export interface ResolvedZipPlace {
  zip: string;
  placeName: string;
  state: string;
  coordinates: GeoCoordinates | null;
  source: "local" | "cache" | "geocode";
}

function fromLocalRecord(
  zip: string,
  record: ZipPlaceRecord,
  coordinates: GeoCoordinates | null
): ResolvedZipPlace {
  return {
    zip,
    placeName: record.placeName,
    state: record.state,
    coordinates,
    source: "local",
  };
}

async function fetchZippopotamPlace(
  normalized: string
): Promise<ResolvedZipPlace | null> {
  const remote = await fetchZippopotamUsZip(normalized);
  if (!remote) return null;

  return {
    zip: normalized,
    placeName: remote.placeName,
    state: remote.state,
    coordinates: remote.coordinates,
    source: "geocode",
  };
}

/**
 * Instant city/state/coords from local tables or geocode cache — no network.
 * Onboarding uses this so a slow radio does not stall Continue.
 */
export function previewLocalZipPlace(zip: string): ResolvedZipPlace | null {
  const normalized = normalizeZipCode(zip);
  if (!isValidZipCode(normalized)) return null;

  const local = lookupLocalZipPlace(normalized);
  const cached = getCachedGeocodedZipPlace(normalized);
  const coordinates =
    lookupLocalZipCoordinates(normalized) ?? cached?.coordinates ?? null;

  if (local) {
    return fromLocalRecord(normalized, local, coordinates);
  }
  if (cached?.placeName) {
    return {
      zip: normalized,
      placeName: cached.placeName,
      state: cached.state,
      coordinates,
      source: "cache",
    };
  }
  return null;
}

/**
 * Resolve ZIP → display place name + coordinates.
 * Local neighborhood table wins; then geocode cache; then Zippopotam API.
 * Never waits on the network when a local or cached place already exists.
 */
export async function resolveZipPlace(
  zip: string,
  coordinates?: GeoCoordinates | null
): Promise<ResolvedZipPlace | null> {
  const normalized = normalizeZipCode(zip);
  if (!isValidZipCode(normalized)) return null;

  const preview = previewLocalZipPlace(normalized);
  const coords = coordinates ?? preview?.coordinates ?? null;

  if (preview) {
    if (!coords) {
      void geocodeUsZipFallback(normalized);
    }
    return {
      ...preview,
      coordinates: coords ?? preview.coordinates,
    };
  }

  const remote = await fetchZippopotamPlace(normalized);
  if (remote) {
    const mergedCoords = remote.coordinates ?? coords;
    if (mergedCoords && remote.placeName) {
      cacheGeocodedZip(
        normalized,
        mergedCoords,
        remote.placeName,
        remote.state
      );
    }
    return {
      ...remote,
      coordinates: mergedCoords,
    };
  }

  if (coords) {
    return {
      zip: normalized,
      placeName: "",
      state: "",
      coordinates: coords,
      source: "geocode",
    };
  }

  return null;
}

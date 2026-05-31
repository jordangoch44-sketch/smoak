import type { GeoCoordinates } from "@/lib/geo/zip-centroids";
import { lookupLocalZipPlace } from "@/lib/geo/zip-place-names";
import {
  cacheGeocodedZip,
  getCachedGeocodedZipPlace,
} from "@/lib/geo/geocoded-zip-cache";
import { fetchZippopotamUsZip } from "@/lib/geo/zippopotam-client";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";

/**
 * External geocode fallback when ZIP is not in the local centroid table.
 * Uses Zippopotam (US postal codes) — no API key required.
 */
export async function geocodeUsZipFallback(
  zip: string
): Promise<GeoCoordinates | null> {
  const normalized = normalizeZipCode(zip);
  if (!isValidZipCode(normalized)) return null;

  const cached = getCachedGeocodedZipPlace(normalized);
  if (cached) return cached.coordinates;

  const localPlace = lookupLocalZipPlace(normalized);

  const remote = await fetchZippopotamUsZip(normalized);
  if (!remote) return null;

  const placeName = localPlace?.placeName ?? remote.placeName;
  const state = localPlace?.state ?? remote.state;

  cacheGeocodedZip(normalized, remote.coordinates, placeName, state);
  return remote.coordinates;
}

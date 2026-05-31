import type { GeoCoordinates } from "@/lib/geo/zip-centroids";
import { lookupLocalZipCoordinates } from "@/lib/geo/zip-centroids";
import { getCachedGeocodedZipPlace } from "@/lib/geo/geocoded-zip-cache";
import { geocodeUsZipFallback } from "@/lib/geo/zip-geocode-fallback";
import { resolveZipPlace } from "@/lib/geo/resolve-zip-place";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";

export const ZIP_UNRECOGNIZED_MESSAGE =
  "We don't recognize that ZIP yet. Try a nearby ZIP or city.";

export type ZipResolveSource = "local" | "geocode";

export interface ZipResolveSuccess {
  ok: true;
  zip: string;
  coordinates: GeoCoordinates;
  /** Neighborhood / city label from ZIP — empty when unknown */
  placeName: string | null;
  state: string | null;
  source: ZipResolveSource;
}

export interface ZipResolveFailure {
  ok: false;
  reason: "invalid" | "unresolved";
  message: string;
}

export type ZipResolveResult = ZipResolveSuccess | ZipResolveFailure;

/**
 * Resolve ZIP → coordinates + place name (local table → geocode API).
 * Place name always comes from the same ZIP resolution — never a separate city pick.
 */
export async function resolveZipLocation(zip: string): Promise<ZipResolveResult> {
  const normalized = normalizeZipCode(zip);

  if (!isValidZipCode(normalized)) {
    return {
      ok: false,
      reason: "invalid",
      message: "Enter a valid 5-digit US ZIP code.",
    };
  }

  const localCoords = lookupLocalZipCoordinates(normalized);
  const place = await resolveZipPlace(normalized, localCoords);

  let coordinates = localCoords ?? place?.coordinates ?? null;
  if (!coordinates) {
    coordinates = await geocodeUsZipFallback(normalized);
  }

  if (!coordinates) {
    return {
      ok: false,
      reason: "unresolved",
      message: ZIP_UNRECOGNIZED_MESSAGE,
    };
  }

  let placeName = place?.placeName?.trim() || null;
  let state = place?.state?.trim() || null;
  if (!placeName) {
    const cached = getCachedGeocodedZipPlace(normalized);
    if (cached?.placeName) {
      placeName = cached.placeName;
      state = cached.state || state;
    }
  }
  const source: ZipResolveSource = localCoords ? "local" : "geocode";

  return {
    ok: true,
    zip: normalized,
    coordinates,
    placeName: placeName || null,
    state,
    source,
  };
}

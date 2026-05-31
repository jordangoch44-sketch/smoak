import { lookupLocalZipCoordinates } from "@/lib/geo/zip-centroids";
import { resolveZipPlace } from "@/lib/geo/resolve-zip-place";

export interface ZipPlaceLookup {
  zip: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Resolve ZIP → city/state for specialist onboarding.
 * Place name always comes from the ZIP lookup table / geocoder for that ZIP.
 */
export async function lookupZipPlace(
  zip: string
): Promise<ZipPlaceLookup | null> {
  const resolved = await resolveZipPlace(
    zip,
    lookupLocalZipCoordinates(zip)
  );
  if (!resolved) return null;

  const coords =
    resolved.coordinates ?? lookupLocalZipCoordinates(resolved.zip);
  if (!resolved.placeName && !coords) return null;

  return {
    zip: resolved.zip,
    city: resolved.placeName,
    state: resolved.state,
    latitude: coords?.latitude,
    longitude: coords?.longitude,
  };
}

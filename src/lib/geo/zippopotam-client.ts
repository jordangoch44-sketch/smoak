import type { GeoCoordinates } from "@/lib/geo/zip-centroids";

const REQUEST_TIMEOUT_MS = 8_000;

interface ZippopotamPlace {
  "place name": string;
  "state abbreviation": string;
  latitude: string;
  longitude: string;
}

interface ZippopotamResponse {
  places?: ZippopotamPlace[];
}

export interface ZippopotamZipResult {
  placeName: string;
  state: string;
  coordinates: GeoCoordinates;
}

/**
 * US ZIP lookup via Zippopotam (no API key).
 * Shared by resolve-zip-place and zip-geocode-fallback.
 */
export async function fetchZippopotamUsZip(
  normalizedZip: string
): Promise<ZippopotamZipResult | null> {
  if (typeof fetch === "undefined") return null;

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );
    const response = await fetch(
      `https://api.zippopotam.us/us/${normalizedZip}`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }
    );
    window.clearTimeout(timeout);
    if (!response.ok) return null;

    const data = (await response.json()) as ZippopotamResponse;
    const place = data.places?.[0];
    if (!place?.["place name"]) return null;

    const latitude = Number.parseFloat(place.latitude);
    const longitude = Number.parseFloat(place.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      placeName: place["place name"].trim(),
      state: (place["state abbreviation"] || "").trim().toUpperCase(),
      coordinates: { latitude, longitude },
    };
  } catch {
    return null;
  }
}

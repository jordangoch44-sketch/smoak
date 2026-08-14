import type { GeoCoordinates } from "@/lib/geo/zip-centroids";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";

export interface ForwardGeocodeResult extends GeoCoordinates {
  formattedAddress: string;
  zip: string | null;
  city: string | null;
  state: string | null;
}

const GEOCODE_TIMEOUT_MS = 10_000;

interface NominatimSearchHit {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    "ISO3166-2-lvl4"?: string;
  };
}

function normalizeStateCode(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.includes("-")) {
    const part = raw.split("-").pop()?.trim();
    return part && part.length === 2 ? part.toUpperCase() : raw;
  }
  return raw.length === 2 ? raw.toUpperCase() : raw;
}

/**
 * Forward-geocode a US street / studio address (Nominatim).
 * User-initiated only — not for bulk/autocomplete spam.
 */
export async function geocodeUsAddress(
  query: string
): Promise<ForwardGeocodeResult | null> {
  const trimmed = query.trim();
  if (trimmed.length < 5 || typeof fetch === "undefined") return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");

  const controller = new AbortController();
  const timer = globalThis.setTimeout(
    () => controller.abort(),
    GEOCODE_TIMEOUT_MS
  );

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "SMOAC/1.0 (specialist-work-location)",
      },
    });
    if (!response.ok) return null;

    const hits = (await response.json()) as NominatimSearchHit[];
    const hit = hits[0];
    if (!hit?.lat || !hit?.lon) return null;

    const latitude = Number.parseFloat(hit.lat);
    const longitude = Number.parseFloat(hit.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    const postcode = hit.address?.postcode
      ? normalizeZipCode(hit.address.postcode)
      : "";
    const zip = isValidZipCode(postcode) ? postcode : null;
    const city =
      hit.address?.city?.trim() ||
      hit.address?.town?.trim() ||
      hit.address?.village?.trim() ||
      hit.address?.municipality?.trim() ||
      null;
    const state =
      normalizeStateCode(hit.address?.["ISO3166-2-lvl4"]) ??
      hit.address?.state?.trim() ??
      null;

    return {
      latitude,
      longitude,
      formattedAddress: hit.display_name?.trim() || trimmed,
      zip,
      city,
      state,
    };
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

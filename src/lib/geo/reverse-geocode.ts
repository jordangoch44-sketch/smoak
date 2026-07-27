import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";

export interface ReverseGeocodeResult {
  zip: string | null;
  placeName: string | null;
  state: string | null;
  source: "bigdatacloud" | "nominatim";
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
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

async function reverseGeocodeBigDataCloud(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  const url = new URL(
    "https://api.bigdatacloud.net/data/reverse-geocode-client"
  );
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("localityLanguage", "en");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    postcode?: string;
    city?: string;
    locality?: string;
    principalSubdivision?: string;
    principalSubdivisionCode?: string;
    countryCode?: string;
  };

  if (data.countryCode && data.countryCode.toUpperCase() !== "US") {
    return {
      zip: null,
      placeName: firstNonEmpty(data.city, data.locality),
      state: normalizeStateCode(data.principalSubdivisionCode) ?? data.principalSubdivision ?? null,
      source: "bigdatacloud",
    };
  }

  const zipRaw = data.postcode?.replace(/\D/g, "").slice(0, 5) ?? "";
  const zip = isValidZipCode(normalizeZipCode(zipRaw))
    ? normalizeZipCode(zipRaw)
    : null;

  return {
    zip,
    placeName: firstNonEmpty(data.locality, data.city),
    state:
      normalizeStateCode(data.principalSubdivisionCode) ??
      data.principalSubdivision ??
      null,
    source: "bigdatacloud",
  };
}

async function reverseGeocodeNominatim(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      /* Nominatim asks for a identifying UA */
      "User-Agent": "SMOAC/1.0 (marketplace location; https://smoac.com)",
    },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    address?: {
      postcode?: string;
      city?: string;
      town?: string;
      village?: string;
      hamlet?: string;
      suburb?: string;
      neighbourhood?: string;
      state?: string;
      country_code?: string;
    };
  };

  const address = data.address;
  if (!address) return null;

  if (address.country_code && address.country_code.toLowerCase() !== "us") {
    return {
      zip: null,
      placeName: firstNonEmpty(
        address.neighbourhood,
        address.suburb,
        address.city,
        address.town,
        address.village
      ),
      state: address.state ?? null,
      source: "nominatim",
    };
  }

  const zipRaw = address.postcode?.replace(/\D/g, "").slice(0, 5) ?? "";
  const zip = isValidZipCode(normalizeZipCode(zipRaw))
    ? normalizeZipCode(zipRaw)
    : null;

  return {
    zip,
    placeName: firstNonEmpty(
      address.neighbourhood,
      address.suburb,
      address.city,
      address.town,
      address.village,
      address.hamlet
    ),
    state: address.state ?? null,
    source: "nominatim",
  };
}

/**
 * GPS → postal code + place label for client market personalization.
 * Prefers BigDataCloud (no key); falls back to Nominatim.
 */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  try {
    const primary = await reverseGeocodeBigDataCloud(latitude, longitude);
    if (primary?.zip || primary?.placeName) return primary;
  } catch {
    /* try fallback */
  }

  try {
    return await reverseGeocodeNominatim(latitude, longitude);
  } catch {
    return null;
  }
}

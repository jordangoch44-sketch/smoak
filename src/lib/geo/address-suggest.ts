import type { ForwardGeocodeResult } from "@/lib/geo/forward-geocode";

export interface AddressSuggestion {
  id: string;
  label: string;
  /** Present when the suggest provider already returned coordinates */
  latitude?: number;
  longitude?: number;
  zip?: string | null;
  city?: string | null;
  state?: string | null;
}

function getPlacesApiKey(): string | null {
  const key =
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    "";
  return key || null;
}

async function suggestGooglePlaces(
  query: string
): Promise<AddressSuggestion[]> {
  const apiKey = getPlacesApiKey();
  if (!apiKey) return [];

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json"
  );
  url.searchParams.set("input", query);
  url.searchParams.set("types", "address");
  url.searchParams.set("components", "country:us");
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      status?: string;
      predictions?: Array<{ place_id?: string; description?: string }>;
    };
    if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return [];
    }
    return (data.predictions ?? [])
      .filter((p) => p.place_id && p.description)
      .slice(0, 6)
      .map((p) => ({
        id: `g:${p.place_id}`,
        label: p.description!,
      }));
  } catch {
    return [];
  }
}

interface PhotonFeature {
  type?: string;
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    countrycode?: string;
  };
}

function formatPhotonLabel(props: PhotonFeature["properties"]): string | null {
  if (!props) return null;
  const line = [props.housenumber, props.street || props.name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const city = props.city || props.town || props.village || "";
  const state = props.state || "";
  const zip = props.postcode || "";
  const parts = [line || props.name, city, [state, zip].filter(Boolean).join(" ")]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

async function suggestPhoton(query: string): Promise<AddressSuggestion[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", "en");
  url.searchParams.set("lat", "32.7157");
  url.searchParams.set("lon", "-117.1611");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "SMOAC/1.0 (specialist-address-suggest)",
      },
      next: { revalidate: 0 },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { features?: PhotonFeature[] };
    const out: AddressSuggestion[] = [];
    for (const feature of data.features ?? []) {
      const props = feature.properties;
      if (props?.countrycode && props.countrycode.toUpperCase() !== "US") {
        continue;
      }
      const label = formatPhotonLabel(props);
      const coords = feature.geometry?.coordinates;
      if (!label || !coords || coords.length < 2) continue;
      const [longitude, latitude] = coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
      out.push({
        id: `p:${props?.osm_type ?? "n"}:${props?.osm_id ?? label}`,
        label,
        latitude,
        longitude,
        zip: props?.postcode ?? null,
        city: props?.city || props?.town || props?.village || null,
        state: props?.state ?? null,
      });
    }
    return out.slice(0, 6);
  } catch {
    return [];
  }
}

/** Server-side address suggestions (Google Places when configured, else Photon). */
export async function suggestUsAddresses(
  query: string
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const google = await suggestGooglePlaces(trimmed);
  if (google.length > 0) return google;

  return suggestPhoton(trimmed);
}

/** Resolve a Google place_id suggestion to coordinates + formatted address. */
export async function resolveGooglePlaceSuggestion(
  placeId: string
): Promise<ForwardGeocodeResult | null> {
  const apiKey = getPlacesApiKey();
  if (!apiKey || !placeId) return null;

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "formatted_address,geometry,address_component"
  );
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      result?: {
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
        address_components?: Array<{
          long_name?: string;
          short_name?: string;
          types?: string[];
        }>;
      };
    };
    const result = data.result;
    const lat = result?.geometry?.location?.lat;
    const lng = result?.geometry?.location?.lng;
    if (lat == null || lng == null) return null;

    let zip: string | null = null;
    let city: string | null = null;
    let state: string | null = null;
    for (const part of result?.address_components ?? []) {
      const types = part.types ?? [];
      if (types.includes("postal_code")) zip = part.long_name ?? null;
      if (types.includes("locality")) city = part.long_name ?? null;
      if (types.includes("administrative_area_level_1")) {
        state = part.short_name ?? part.long_name ?? null;
      }
    }

    return {
      latitude: lat,
      longitude: lng,
      formattedAddress:
        result?.formatted_address?.trim() ||
        `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      zip,
      city,
      state,
    };
  } catch {
    return null;
  }
}

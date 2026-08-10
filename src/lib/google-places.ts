/**
 * Google Places (legacy Place Details) helpers for Pro Google Reviews connect.
 * Server-only — requires GOOGLE_PLACES_API_KEY (or GOOGLE_MAPS_API_KEY).
 */

export type GooglePlaceSnapshot = {
  placeId: string;
  mapsUrl: string;
  rating: number | null;
  reviewCount: number;
  fetchedAt: string;
};

export type GooglePlacesResult =
  | { ok: true; snapshot: GooglePlaceSnapshot }
  | { ok: false; message: string };

function getPlacesApiKey(): string | null {
  const key =
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    "";
  return key || null;
}

/** Extract a Place ID from common Maps / share URLs or a raw ChIJ… id. */
export function extractGooglePlaceId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^ChIJ[\w-]+$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    );
    const fromQuery =
      url.searchParams.get("place_id") ||
      url.searchParams.get("query_place_id");
    if (fromQuery && /^ChIJ[\w-]+$/.test(fromQuery)) return fromQuery;

    const dataMatch = url.pathname.match(/!1s(0x[\da-f]+:0x[\da-f]+)/i);
    if (dataMatch?.[1]) {
      /* Hex ftid form — not a Place ID; caller should paste Place ID. */
      return null;
    }

    const placePath = url.pathname.match(/\/place\/[^/]+\/([\w-]+)/);
    if (placePath?.[1] && /^ChIJ[\w-]+$/.test(placePath[1])) {
      return placePath[1];
    }
  } catch {
    /* not a URL */
  }

  const embedded = trimmed.match(/\b(ChIJ[\w-]+)\b/);
  return embedded?.[1] ?? null;
}

function normalizeMapsUrl(raw: string, fallbackPlaceId: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed && /^[\w.-]+\.[\w.-]+/.test(trimmed)) return `https://${trimmed}`;
  return `https://www.google.com/maps/place/?q=place_id:${fallbackPlaceId}`;
}

/**
 * Fetch rating + review count for a Place ID.
 * Uses Place Details (Fields: place_id,rating,user_ratings_total,url).
 */
export async function fetchGooglePlaceSnapshot(
  placeIdOrUrl: string
): Promise<GooglePlacesResult> {
  const apiKey = getPlacesApiKey();
  if (!apiKey) {
    return {
      ok: false,
      message:
        "Google Places is not configured yet. Add GOOGLE_PLACES_API_KEY on the server.",
    };
  }

  const placeId =
    extractGooglePlaceId(placeIdOrUrl) ||
    (/^ChIJ[\w-]+$/.test(placeIdOrUrl.trim()) ? placeIdOrUrl.trim() : null);

  if (!placeId) {
    return {
      ok: false,
      message:
        "Could not find a Google Place ID. Paste a Place ID (starts with ChIJ…) or a Maps link that includes place_id=.",
    };
  }

  const endpoint = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
  endpoint.searchParams.set("place_id", placeId);
  endpoint.searchParams.set("fields", "place_id,name,rating,user_ratings_total,url");
  endpoint.searchParams.set("key", apiKey);

  let json: {
    status?: string;
    error_message?: string;
    result?: {
      place_id?: string;
      rating?: number;
      user_ratings_total?: number;
      url?: string;
    };
  };

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      cache: "no-store",
    });
    json = (await response.json()) as typeof json;
  } catch {
    return {
      ok: false,
      message: "Could not reach Google Places. Try again in a moment.",
    };
  }

  if (json.status !== "OK" || !json.result?.place_id) {
    return {
      ok: false,
      message:
        json.error_message ||
        `Google Places returned ${json.status || "an error"}. Check the Place ID.`,
    };
  }

  const rating =
    typeof json.result.rating === "number" && Number.isFinite(json.result.rating)
      ? json.result.rating
      : null;
  const reviewCount =
    typeof json.result.user_ratings_total === "number" &&
    Number.isFinite(json.result.user_ratings_total)
      ? Math.max(0, Math.floor(json.result.user_ratings_total))
      : 0;

  return {
    ok: true,
    snapshot: {
      placeId: json.result.place_id,
      mapsUrl: normalizeMapsUrl(
        json.result.url || placeIdOrUrl,
        json.result.place_id
      ),
      rating,
      reviewCount,
      fetchedAt: new Date().toISOString(),
    },
  };
}

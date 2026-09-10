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

const PLACE_ID_RE = /^ChIJ[\w-]+$/;

function getPlacesApiKey(): string | null {
  const key =
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    "";
  return key || null;
}

function isPlaceId(value: string): boolean {
  return PLACE_ID_RE.test(value);
}

function asAbsoluteUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

function isGoogleMapsShortHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./i, "").toLowerCase();
  return (
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    host === "g.page" ||
    host === "g.co"
  );
}

/** Follow Business Profile / Maps share short links to the canonical Maps URL. */
async function resolveGoogleMapsShareUrl(input: string): Promise<string> {
  const url = asAbsoluteUrl(input);
  if (!url || !isGoogleMapsShortHost(url.hostname)) return input.trim();

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (compatible; SMOAC-GoogleReviews/1.0; +https://smoac.com)",
      },
    });
    return response.url || url.toString();
  } catch {
    return url.toString();
  }
}

/** Extract a Place ID from common Maps / Business Profile URLs or a raw ChIJ… id. */
export function extractGooglePlaceId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (isPlaceId(trimmed)) return trimmed;

  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    );

    for (const key of ["place_id", "query_place_id", "placeid", "placeId"]) {
      const fromQuery = url.searchParams.get(key);
      if (fromQuery && isPlaceId(fromQuery)) return fromQuery;
    }

    const q = url.searchParams.get("q") ?? "";
    const qPlace = q.match(/place_id:?\s*(ChIJ[\w-]+)/i);
    if (qPlace?.[1] && isPlaceId(qPlace[1])) return qPlace[1];

    const blob = `${url.pathname}${url.search}${url.hash}`;
    const bangPlace = blob.match(/!1s(ChIJ[\w-]+)/);
    if (bangPlace?.[1] && isPlaceId(bangPlace[1])) return bangPlace[1];

    const placePath = url.pathname.match(/\/(?:place|maps\/place)\/[^/]+\/(ChIJ[\w-]+)/);
    if (placePath?.[1] && isPlaceId(placePath[1])) return placePath[1];
  } catch {
    /* not a URL */
  }

  const embedded = trimmed.match(/\b(ChIJ[\w-]+)\b/);
  return embedded?.[1] ?? null;
}

function mapsPlaceNameAndPoint(urlString: string): {
  name: string;
  lat: string | null;
  lng: string | null;
} | null {
  const url = asAbsoluteUrl(urlString);
  if (!url) return null;
  const placePart = url.pathname.match(/\/place\/([^/]+)/);
  if (!placePart?.[1]) return null;
  let name = placePart[1];
  try {
    name = decodeURIComponent(name.replace(/\+/g, " "));
  } catch {
    name = name.replace(/\+/g, " ");
  }
  name = name.trim();
  if (!name || isPlaceId(name) || name.startsWith("data=")) return null;

  const at = `${url.pathname}${url.search}`.match(
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/
  );
  return {
    name,
    lat: at?.[1] ?? null,
    lng: at?.[2] ?? null,
  };
}

async function findPlaceIdFromMapsListing(
  urlString: string,
  apiKey: string
): Promise<string | null> {
  const parsed = mapsPlaceNameAndPoint(urlString);
  if (!parsed) return null;

  const endpoint = new URL(
    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
  );
  endpoint.searchParams.set("input", parsed.name);
  endpoint.searchParams.set("inputtype", "textquery");
  endpoint.searchParams.set("fields", "place_id");
  endpoint.searchParams.set("key", apiKey);
  if (parsed.lat && parsed.lng) {
    endpoint.searchParams.set(
      "locationbias",
      `point:${parsed.lat},${parsed.lng}`
    );
  }

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      cache: "no-store",
    });
    const json = (await response.json()) as {
      candidates?: Array<{ place_id?: string }>;
    };
    const placeId = json.candidates?.[0]?.place_id?.trim() ?? "";
    return isPlaceId(placeId) ? placeId : null;
  } catch {
    return null;
  }
}

function normalizeMapsUrl(raw: string, fallbackPlaceId: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed && /^[\w.-]+\.[\w.-]+/.test(trimmed)) return `https://${trimmed}`;
  return `https://www.google.com/maps/place/?q=place_id:${fallbackPlaceId}`;
}

/**
 * Fetch rating + review count for a Place ID or Google Business / Maps link.
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

  const resolvedInput = await resolveGoogleMapsShareUrl(placeIdOrUrl);
  const placeId =
    extractGooglePlaceId(resolvedInput) ||
    extractGooglePlaceId(placeIdOrUrl) ||
    (await findPlaceIdFromMapsListing(resolvedInput, apiKey));

  if (!placeId) {
    return {
      ok: false,
      message:
        "Could not find that Google Business Profile. Paste a Maps / Business share link or a Place ID (starts with ChIJ…).",
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
        json.result.url || resolvedInput || placeIdOrUrl,
        json.result.place_id
      ),
      rating,
      reviewCount,
      fetchedAt: new Date().toISOString(),
    },
  };
}

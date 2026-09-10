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
/** Google Maps / Business Profile customer ID (cid=), not a ChIJ Place ID. */
const CID_RE = /^\d{10,20}$/;
const MAPS_FETCH_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1";
const SKIP_NEARBY_TYPES = new Set([
  "locality",
  "political",
  "route",
  "country",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "postal_code",
]);

type MapsCoords = { lat: string; lng: string };

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

function isCid(value: string): boolean {
  return CID_RE.test(value.trim());
}

function decodeLoose(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value.replace(/%3A/gi, ":").replace(/%21/gi, "!");
  }
}

/** Pull a Google URL out of a share-sheet paste that also has a title/name. */
export function extractGoogleInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return trimmed;
  return match[0].replace(/[),.;]+$/g, "");
}

function asAbsoluteUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    );
  } catch {
    return null;
  }
}

function isGoogleShareHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./i, "").toLowerCase();
  return (
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    host === "g.page" ||
    host === "g.co" ||
    host === "share.google" ||
    host === "maps.app.goo.gle"
  );
}

export function extractGoogleCid(input: string): string | null {
  const decoded = decodeLoose(input.trim());
  if (!decoded) return null;
  if (isCid(decoded)) return decoded;
  try {
    const url = asAbsoluteUrl(decoded);
    const fromQuery = url?.searchParams.get("cid")?.trim() ?? "";
    if (isCid(fromQuery)) return fromQuery;
  } catch {
    /* not a URL */
  }
  const queryCid = decoded.match(/[?&]cid=(\d{10,20})\b/i);
  if (queryCid?.[1]) return queryCid[1];
  const hex = decoded.match(/1s0x[0-9a-f]+:0x([0-9a-f]+)/i);
  if (hex?.[1]) {
    try {
      const cid = BigInt(`0x${hex[1]}`).toString();
      return isCid(cid) ? cid : null;
    } catch {
      return null;
    }
  }
  return null;
}

function mapsUrlForCid(cid: string): string {
  return `https://maps.google.com/?cid=${cid}`;
}

function coordsFromText(blob: string): MapsCoords | null {
  const decoded = decodeLoose(blob);
  const at = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at?.[1] && at?.[2]) return { lat: at[1], lng: at[2] };
  const bang = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bang?.[1] && bang?.[2]) return { lat: bang[1], lng: bang[2] };
  const app = decoded.match(
    /APP_INITIALIZATION_STATE=\[\[\[([\d.]+),(-?[\d.]+),(-?[\d.]+)/
  );
  if (app?.[2] && app?.[3]) return { lng: app[2], lat: app[3] };
  const pb = decoded.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
  if (pb?.[1] && pb?.[2]) return { lng: pb[1], lat: pb[2] };
  return null;
}

function placeNameFromMapsUrl(urlString: string): string | null {
  const url = asAbsoluteUrl(urlString);
  if (!url) return null;
  const placePart = url.pathname.match(/\/place\/([^/]+)/);
  if (placePart?.[1]) {
    const name = decodeLoose(placePart[1]).trim();
    if (name && !isPlaceId(name) && !name.startsWith("data=")) return name;
  }
  for (const key of ["q", "query"]) {
    const value = url.searchParams.get(key)?.trim() ?? "";
    if (!value) continue;
    if (/^place_id:/i.test(value)) continue;
    if (isPlaceId(value) || isCid(value)) continue;
    return decodeLoose(value).trim() || null;
  }
  return null;
}

function extractMapsUrlFromHtml(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /window\.location(?:\.replace|\.href)\s*\(\s*["']([^"']+)["']/i,
    /window\.location(?:\.replace|\.href)\s*=\s*["']([^"']+)["']/i,
    /https:\/\/(?:www\.)?google\.com\/maps\/place\/[^"'<\s]+/i,
    /https:\/\/maps\.google\.com\/[^"'<\s]+/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const candidate = match?.[1] ?? match?.[0];
    if (candidate && /google\.com\/maps|maps\.google\.com/i.test(candidate)) {
      return decodeLoose(candidate);
    }
  }
  return null;
}

async function expandGoogleShareUrl(
  input: string
): Promise<{ url: string; html: string }> {
  const url = asAbsoluteUrl(input);
  if (!url) return { url: input.trim(), html: "" };
  if (!isGoogleShareHost(url.hostname)) {
    return { url: url.toString(), html: "" };
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": MAPS_FETCH_UA,
      },
    });
    const html = await response.text();
    const fromHtml = extractMapsUrlFromHtml(html);
    return {
      url: fromHtml || response.url || url.toString(),
      html,
    };
  } catch {
    return { url: url.toString(), html: "" };
  }
}

/** Extract a Place ID from common Maps / Business Profile URLs or a raw ChIJ… id. */
export function extractGooglePlaceId(input: string): string | null {
  const trimmed = decodeLoose(input.trim());
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

    const q = url.searchParams.get("q") ?? url.searchParams.get("query") ?? "";
    const qPlace = q.match(/place_id:?\s*(ChIJ[\w-]+)/i);
    if (qPlace?.[1] && isPlaceId(qPlace[1])) return qPlace[1];

    const blob = `${url.pathname}${url.search}${url.hash}`;
    const bangPlace = blob.match(/!1s(ChIJ[\w-]+)/);
    if (bangPlace?.[1] && isPlaceId(bangPlace[1])) return bangPlace[1];

    const placePath = url.pathname.match(
      /\/(?:place|maps\/place)\/[^/]+\/(ChIJ[\w-]+)/
    );
    if (placePath?.[1] && isPlaceId(placePath[1])) return placePath[1];
  } catch {
    /* not a URL */
  }

  const embedded = trimmed.match(/\b(ChIJ[\w-]+)\b/);
  return embedded?.[1] ?? null;
}

async function findPlaceIdFromTextQuery(
  input: string,
  apiKey: string,
  bias?: MapsCoords | null
): Promise<string | null> {
  const endpoint = new URL(
    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
  );
  endpoint.searchParams.set("input", input);
  endpoint.searchParams.set("inputtype", "textquery");
  endpoint.searchParams.set("fields", "place_id");
  endpoint.searchParams.set("key", apiKey);
  if (bias?.lat && bias?.lng) {
    endpoint.searchParams.set("locationbias", `point:${bias.lat},${bias.lng}`);
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

async function findPlaceIdFromTextSearch(
  query: string,
  apiKey: string,
  bias?: MapsCoords | null
): Promise<string | null> {
  const endpoint = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json"
  );
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("key", apiKey);
  if (bias?.lat && bias?.lng) {
    endpoint.searchParams.set("location", `${bias.lat},${bias.lng}`);
    endpoint.searchParams.set("radius", "120");
  }
  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      cache: "no-store",
    });
    const json = (await response.json()) as {
      results?: Array<{ place_id?: string; types?: string[] }>;
    };
    const match = (json.results ?? []).find((item) => {
      const types = item.types ?? [];
      return (
        isPlaceId(item.place_id ?? "") &&
        !types.some((type) => SKIP_NEARBY_TYPES.has(type))
      );
    });
    const placeId = match?.place_id?.trim() ?? "";
    return isPlaceId(placeId) ? placeId : null;
  } catch {
    return null;
  }
}

async function findPlaceIdNearPoint(
  lat: string,
  lng: string,
  apiKey: string
): Promise<string | null> {
  const endpoint = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
  );
  endpoint.searchParams.set("location", `${lat},${lng}`);
  endpoint.searchParams.set("radius", "50");
  endpoint.searchParams.set("key", apiKey);
  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      cache: "no-store",
    });
    const json = (await response.json()) as {
      results?: Array<{ place_id?: string; types?: string[] }>;
    };
    const match = (json.results ?? []).find((item) => {
      const types = item.types ?? [];
      return (
        isPlaceId(item.place_id ?? "") &&
        !types.some((type) => SKIP_NEARBY_TYPES.has(type))
      );
    });
    const placeId = match?.place_id?.trim() ?? "";
    return isPlaceId(placeId) ? placeId : null;
  } catch {
    return null;
  }
}

async function findPlaceIdFromCid(
  cid: string,
  apiKey: string
): Promise<string | null> {
  const cidUrl = mapsUrlForCid(cid);
  try {
    const response = await fetch(cidUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "text/html",
        "User-Agent": MAPS_FETCH_UA,
      },
    });
    const html = await response.text();
    const resolvedUrl =
      extractMapsUrlFromHtml(html) || response.url || cidUrl;
    const fromHtml =
      extractGooglePlaceId(html) || extractGooglePlaceId(resolvedUrl);
    if (fromHtml) return fromHtml;
    const name = placeNameFromMapsUrl(resolvedUrl);
    const coords = coordsFromText(`${resolvedUrl}\n${html}`);
    if (name) {
      const byName =
        (await findPlaceIdFromTextQuery(name, apiKey, coords)) ||
        (await findPlaceIdFromTextSearch(name, apiKey, coords));
      if (byName) return byName;
    }
    if (coords) return findPlaceIdNearPoint(coords.lat, coords.lng, apiKey);
  } catch {
    /* fall through */
  }
  return null;
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

  const cleaned = extractGoogleInput(placeIdOrUrl);
  const expanded = await expandGoogleShareUrl(cleaned);
  const blob = `${cleaned}\n${expanded.url}\n${expanded.html}`;
  const name =
    placeNameFromMapsUrl(expanded.url) || placeNameFromMapsUrl(cleaned);
  const coords = coordsFromText(blob);
  const cid = extractGoogleCid(cleaned) || extractGoogleCid(blob);

  const placeId =
    extractGooglePlaceId(expanded.url) ||
    extractGooglePlaceId(cleaned) ||
    extractGooglePlaceId(expanded.html) ||
    (name
      ? await findPlaceIdFromTextQuery(name, apiKey, coords)
      : null) ||
    (name ? await findPlaceIdFromTextSearch(name, apiKey, coords) : null) ||
    (cid ? await findPlaceIdFromCid(cid, apiKey) : null) ||
    (coords ? await findPlaceIdNearPoint(coords.lat, coords.lng, apiKey) : null);

  if (!placeId) {
    return {
      ok: false,
      message:
        "Could not find that Google listing. Paste the Maps share link (maps.app.goo.gl), the full Maps URL, or a Place ID starting with ChIJ.",
    };
  }

  const endpoint = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
  endpoint.searchParams.set("place_id", placeId);
  endpoint.searchParams.set(
    "fields",
    "place_id,name,rating,user_ratings_total,url"
  );
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
    console.warn("[SMOAC google-reviews] Place Details failed:", json.status);
    return {
      ok: false,
      message:
        json.status === "REQUEST_DENIED"
          ? "Google blocked this Places request. Enable Places API (legacy) for the key."
          : json.error_message ||
            `Google Places returned ${json.status || "an error"}. Try a Maps share link instead.`,
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
        json.result.url || expanded.url || cleaned,
        json.result.place_id
      ),
      rating,
      reviewCount,
      fetchedAt: new Date().toISOString(),
    },
  };
}

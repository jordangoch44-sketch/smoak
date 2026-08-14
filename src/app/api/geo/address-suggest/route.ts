import { NextResponse } from "next/server";
import {
  resolveGooglePlaceSuggestion,
  suggestUsAddresses,
} from "@/lib/geo/address-suggest";
import { geocodeUsAddress } from "@/lib/geo/forward-geocode";

export const runtime = "nodejs";

/** GET ?q= — address autocomplete suggestions */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = await suggestUsAddresses(q);
  return NextResponse.json({ suggestions });
}

/**
 * POST — resolve a suggestion or free-typed address to lat/lng.
 * Body: { placeId?: string, query?: string, suggestion?: AddressSuggestion }
 */
export async function POST(request: Request) {
  let body: {
    placeId?: string;
    query?: string;
    latitude?: number;
    longitude?: number;
    label?: string;
    zip?: string | null;
    city?: string | null;
    state?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (
    body.latitude != null &&
    body.longitude != null &&
    Number.isFinite(body.latitude) &&
    Number.isFinite(body.longitude) &&
    body.label?.trim()
  ) {
    return NextResponse.json({
      ok: true,
      result: {
        latitude: body.latitude,
        longitude: body.longitude,
        formattedAddress: body.label.trim(),
        zip: body.zip ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
      },
    });
  }

  if (body.placeId?.trim()) {
    const result = await resolveGooglePlaceSuggestion(body.placeId.trim());
    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Could not resolve that place." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, result });
  }

  const query = body.query?.trim() ?? "";
  if (query.length >= 5) {
    const result = await geocodeUsAddress(query);
    if (!result) {
      return NextResponse.json(
        { ok: false, error: "We couldn't find that address." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, result });
  }

  return NextResponse.json(
    { ok: false, error: "Provide a suggestion or address query." },
    { status: 400 }
  );
}

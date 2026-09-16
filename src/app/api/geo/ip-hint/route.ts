import { NextResponse } from "next/server";
import { MARKETPLACE_CITIES } from "@/data/locations";
import {
  DEFAULT_MARKETPLACE_CITY,
  findNearbyLiveMarketplaceCity,
  isLiveMarketplaceCity,
} from "@/lib/marketplace-city-centers";

export const runtime = "edge";

function headerText(headers: Headers, name: string): string | null {
  const raw = headers.get(name);
  if (!raw?.trim()) return null;
  try {
    return decodeURIComponent(raw.replace(/\+/g, " ")).trim();
  } catch {
    return raw.trim();
  }
}

function headerNumber(headers: Headers, name: string): number | null {
  const raw = headers.get(name);
  if (!raw) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

function matchMarketplaceCityName(city: string | null): string | null {
  if (!city) return null;
  const folded = city.trim().toLowerCase();
  return (
    MARKETPLACE_CITIES.find((entry) => entry.toLowerCase() === folded) ?? null
  );
}

/** GET — coarse IP city/coords from the edge (Marketplace rails + Search fallback). */
export async function GET(request: Request) {
  const { headers } = request;
  const country = headerText(headers, "x-vercel-ip-country");
  const city = headerText(headers, "x-vercel-ip-city");
  const latitude = headerNumber(headers, "x-vercel-ip-latitude");
  const longitude = headerNumber(headers, "x-vercel-ip-longitude");

  const nearbyLive =
    country === "US" && latitude != null && longitude != null
      ? findNearbyLiveMarketplaceCity(latitude, longitude)
      : null;
  const named = matchMarketplaceCityName(city);
  const liveNamed = isLiveMarketplaceCity(named) ? named : null;
  const marketplaceCity =
    nearbyLive ?? liveNamed ?? DEFAULT_MARKETPLACE_CITY;
  const useRealCoords = nearbyLive != null;

  return NextResponse.json({
    city: marketplaceCity,
    marketplaceCity,
    latitude: useRealCoords ? latitude : null,
    longitude: useRealCoords ? longitude : null,
  });
}

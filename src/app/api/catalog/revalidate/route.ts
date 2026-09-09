import { NextResponse } from "next/server";
import { revalidatePublicMarketplaceCatalog } from "@/lib/profiles/revalidate-public-catalog";

export const runtime = "nodejs";

/**
 * Bust the SSR marketplace catalog cache after a specialist publishes
 * location (or other profile) changes so cards/sheets show fresh distance.
 */
export async function POST() {
  try {
    revalidatePublicMarketplaceCatalog();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("[SMOAC catalog] revalidate failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not refresh catalog cache" },
      { status: 500 }
    );
  }
}

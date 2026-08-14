import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Bust the SSR marketplace catalog cache after a specialist publishes
 * location (or other profile) changes so cards/sheets show fresh distance.
 */
export async function POST() {
  try {
    revalidateTag("public-catalog", { expire: 0 });
    revalidatePath("/explore");
    revalidatePath("/");
    revalidatePath("/trainers", "layout");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("[SMOAC catalog] revalidate failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not refresh catalog cache" },
      { status: 500 }
    );
  }
}

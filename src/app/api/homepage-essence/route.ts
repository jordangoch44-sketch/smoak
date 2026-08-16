import { NextResponse } from "next/server";
import { readHomeEssenceConfig } from "@/lib/home-essence-config-store";
import { listActiveHomeEssenceSlides } from "@/lib/home-essence-slides";

/** Public marketplace essence strip config (enabled slides only). */
export async function GET() {
  const config = await readHomeEssenceConfig();
  const slides = listActiveHomeEssenceSlides(config).map((slide) => ({
    id: slide.id,
    src: slide.src,
    alt: slide.alt,
  }));

  return NextResponse.json(
    {
      ok: true,
      intervalMs: config.intervalMs,
      slides,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    }
  );
}

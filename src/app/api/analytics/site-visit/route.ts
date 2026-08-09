import { NextResponse } from "next/server";
import { createSupabaseAnonServerClient } from "@/lib/supabase/anon-server";

export const runtime = "nodejs";

function clamp(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * First-party site-visit ingest — keeps Safari traffic same-origin.
 * Payload matches the previous browser→Supabase insert (admin analytics unchanged).
 */
export async function POST(request: Request) {
  const supabase = createSupabaseAnonServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const path = clamp(body.path, 300);
  const visitorKey = clamp(body.visitor_key, 100);
  if (!path || !visitorKey || visitorKey.length < 8) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const device =
    body.device === "mobile" || body.device === "desktop" ? body.device : null;

  const { error } = await supabase.from("site_visits").insert({
    path,
    referrer_host: clamp(body.referrer_host, 200),
    utm_source: clamp(body.utm_source, 100),
    utm_medium: clamp(body.utm_medium, 100),
    utm_campaign: clamp(body.utm_campaign, 150),
    visitor_key: visitorKey,
    is_new_visitor: Boolean(body.is_new_visitor),
    device,
  });

  if (error) {
    console.warn("[SMOAC traffic] site-visit API insert failed:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

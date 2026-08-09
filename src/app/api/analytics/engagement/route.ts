import { NextResponse } from "next/server";
import { createSupabaseAnonServerClient } from "@/lib/supabase/anon-server";

export const runtime = "nodejs";

const EVENT_TYPES = new Set([
  "search_appearance",
  "contact_click",
  "booking_click",
]);

function clamp(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * First-party engagement ingest — same data as the prior browser insert.
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

  const eventType = clamp(body.event_type, 40);
  const specialistId = clamp(body.specialist_id, 120);
  const visitorKey = clamp(body.visitor_key, 100);
  if (
    !eventType ||
    !EVENT_TYPES.has(eventType) ||
    !specialistId ||
    !visitorKey ||
    visitorKey.length < 8
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const device =
    body.device === "mobile" || body.device === "desktop" ? body.device : null;

  const { error } = await supabase.from("specialist_engagement_events").insert({
    specialist_id: specialistId,
    event_type: eventType,
    surface: clamp(body.surface, 60),
    path: clamp(body.path, 300),
    visitor_key: visitorKey,
    device,
    inquiry_action: clamp(body.inquiry_action, 60),
  });

  if (error) {
    console.warn("[SMOAC engagement] API insert failed:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

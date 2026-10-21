import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const TOKEN_PATTERN = /^[0-9a-f]{64,200}$/;

function normalizeToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase();
  return TOKEN_PATTERN.test(token) ? token : null;
}

function normalizeEnvironment(value: unknown): "sandbox" | "production" | null {
  if (value === "sandbox" || value === "production") return value;
  return null;
}

async function signedInUserId(): Promise<
  { userId: string } | { error: string; status: number }
> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Authentication is not available.", status: 503 };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to turn on notifications.", status: 401 };
  return { userId: user.id };
}

export async function POST(request: Request) {
  const auth = await signedInUserId();
  if ("error" in auth) {
    return NextResponse.json({ ok: false, message: auth.error }, { status: auth.status });
  }

  let body: { token?: unknown; environment?: unknown };
  try {
    body = (await request.json()) as { token?: unknown; environment?: unknown };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const token = normalizeToken(body.token);
  const environment = normalizeEnvironment(body.environment);
  if (!token || !environment) {
    return NextResponse.json({ ok: false, message: "Invalid device token." }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, message: "Notifications are not available." },
      { status: 503 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await service.from("device_push_tokens").upsert(
    {
      user_id: auth.userId,
      token,
      platform: "ios",
      environment,
      updated_at: now,
    },
    { onConflict: "token" }
  );

  if (error) {
    console.warn("[SMOAC PUSH] token save failed", error.message);
    return NextResponse.json(
      { ok: false, message: "Could not save this device." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await signedInUserId();
  if ("error" in auth) {
    return NextResponse.json({ ok: false, message: auth.error }, { status: auth.status });
  }

  let body: { token?: unknown };
  try {
    body = (await request.json()) as { token?: unknown };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const token = normalizeToken(body.token);
  if (!token) {
    return NextResponse.json({ ok: false, message: "Invalid device token." }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, message: "Notifications are not available." },
      { status: 503 }
    );
  }

  const { error } = await service
    .from("device_push_tokens")
    .delete()
    .eq("token", token)
    .eq("user_id", auth.userId);

  if (error) {
    console.warn("[SMOAC PUSH] token delete failed", error.message);
    return NextResponse.json(
      { ok: false, message: "Could not remove this device." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}

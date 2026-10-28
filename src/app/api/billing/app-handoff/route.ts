import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  BILLING_APP_HANDOFF_PATH,
  BILLING_HANDOFF_TTL_MS,
  parseBillingHandoffIntent,
} from "@/lib/billing-app-handoff";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const RECENT_WINDOW_MS = 10 * 60 * 1000;
const RECENT_LIMIT = 8;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Signed-in specialist asks for a one-time Safari link.
 * The code is returned once. Only its hash is stored.
 */
export async function POST(request: Request) {
  let intent: ReturnType<typeof parseBillingHandoffIntent> = null;
  try {
    intent = parseBillingHandoffIntent(await request.json());
  } catch {
    intent = null;
  }
  if (!intent) {
    return NextResponse.json({ error: "Unknown checkout." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth unavailable." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleRow?.role !== "specialist") {
    return NextResponse.json(
      { error: "Only specialists can purchase marketplace plans." },
      { status: 403 }
    );
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Checkout is not available yet." }, { status: 503 });
  }

  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
  const { count } = await service
    .from("billing_app_handoffs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gt("created_at", since);
  if ((count ?? 0) >= RECENT_LIMIT) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Wait a minute and try again." },
      { status: 429 }
    );
  }

  await service
    .from("billing_app_handoffs")
    .delete()
    .lt("expires_at", new Date().toISOString());

  const code = randomBytes(32).toString("base64url");
  const { error } = await service.from("billing_app_handoffs").insert({
    code_hash: hashCode(code),
    user_id: user.id,
    intent: intent.kind,
    product: intent.kind === "upgrade" ? intent.product : null,
    days: intent.kind === "boost" ? intent.days : null,
    daily_cents: intent.kind === "boost" ? intent.dailyCents : null,
    expires_at: new Date(Date.now() + BILLING_HANDOFF_TTL_MS).toISOString(),
  });
  if (error) {
    return NextResponse.json(
      { error: "Could not open checkout. Try again." },
      { status: 503 }
    );
  }

  const path = `${BILLING_APP_HANDOFF_PATH}?code=${encodeURIComponent(code)}`;
  return NextResponse.json({ path });
}

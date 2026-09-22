import { NextResponse } from "next/server";
import {
  notifyOpsClientSignup,
  notifyOpsSpecialistApplication,
} from "@/lib/email/ops-alert";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Signed-in user asks for a one-time support inbox alert.
 * Identity comes from the session, not the body.
 */
export async function POST(request: Request) {
  let kind = "";
  try {
    const body = (await request.json()) as { kind?: unknown };
    kind = typeof body.kind === "string" ? body.kind.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (kind !== "client" && kind !== "specialist") {
    return NextResponse.json({ ok: false, error: "Unknown kind" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Auth unavailable" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const status =
    kind === "client"
      ? await notifyOpsClientSignup(user)
      : await notifyOpsSpecialistApplication(user);

  return NextResponse.json({ ok: true, status });
}

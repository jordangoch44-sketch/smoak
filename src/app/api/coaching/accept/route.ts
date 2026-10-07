import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptCoachingInvite } from "@/lib/coaching/accept-coaching-invite";

export const runtime = "nodejs";

/**
 * Client accepts a roster invite ({ relationshipId }) or claims an invite link ({ token }),
 * then both sides get an email. Repeat claims of the same link don't email again.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Sign in to continue." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to continue." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    relationshipId?: unknown;
    token?: unknown;
  } | null;
  const relationshipId = typeof body?.relationshipId === "string" ? body.relationshipId.trim() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  const result = await acceptCoachingInvite(supabase, user, { relationshipId, token });
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ ok: true, data: result.data });
}

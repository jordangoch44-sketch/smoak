import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { mapCoachingRelationship } from "@/lib/coaching/coach-workout";
import { sendCoachingRequestEmail } from "@/lib/email/coaching-email-service";
import type { CoachingRelationshipRow } from "@/types/coaching";

export const runtime = "nodejs";

const FRESH_REQUEST_MS = 60_000;

function errorResponse(message: string | undefined): { body: { ok: false; message: string }; status: number } {
  const text = message ?? "";
  if (text.includes("own_profile")) {
    return { body: { ok: false, message: "You can’t connect with your own profile." }, status: 400 };
  }
  if (text.includes("not_found")) {
    return { body: { ok: false, message: "That specialist isn’t available." }, status: 404 };
  }
  if (text.includes("not_allowed")) {
    return { body: { ok: false, message: "Sign in to send a request." }, status: 401 };
  }
  return { body: { ok: false, message: "Couldn’t send the request." }, status: 400 };
}

/** Client asks to add an approved specialist. Emails the specialist when the request is new. */
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

  const body = (await request.json().catch(() => null)) as { specialistId?: unknown } | null;
  const specialistId = typeof body?.specialistId === "string" ? body.specialistId.trim() : "";
  if (!specialistId) {
    return NextResponse.json({ ok: false, message: "Specialist not found." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("request_specialist_connection", {
    p_specialist_id: specialistId,
  });
  if (error || !data) {
    const mapped = errorResponse(error?.message);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }

  const relationship = mapCoachingRelationship(data as CoachingRelationshipRow);
  const requestedAt = Date.parse(relationship.invitedAt);
  const fresh =
    relationship.status === "requested" &&
    Number.isFinite(requestedAt) &&
    Date.now() - requestedAt < FRESH_REQUEST_MS;

  if (fresh) {
    const service = createSupabaseServiceClient();
    if (service) {
      const { data: profile } = await service
        .from("profiles")
        .select("email, first_name")
        .eq("user_id", relationship.specialistUserId)
        .maybeSingle();
      const to = String(profile?.email ?? "").trim();
      if (to) {
        await sendCoachingRequestEmail({
          to,
          specialistFirstName: String(profile?.first_name ?? ""),
          clientFirstName: relationship.clientFirstName,
        });
      }
    }
  }

  return NextResponse.json({ ok: true, data: relationship });
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { mapCoachingRelationship } from "@/lib/coaching/coach-workout";
import { sendRosterWelcomeEmail } from "@/lib/email/coaching-email-service";
import type { CoachingRelationshipRow } from "@/types/coaching";

export const runtime = "nodejs";

/** Specialist accepts or declines a client connection request. Accept requires Pro. */
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
    accept?: unknown;
  } | null;
  const relationshipId = typeof body?.relationshipId === "string" ? body.relationshipId.trim() : "";
  if (!relationshipId || typeof body?.accept !== "boolean") {
    return NextResponse.json({ ok: false, message: "Request not found." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("respond_coaching_request", {
    p_relationship_id: relationshipId,
    p_accept: body.accept,
  });
  if (error || !data) {
    const proRequired = error?.message.includes("pro_required");
    return NextResponse.json(
      {
        ok: false,
        message: proRequired
          ? "Rosters are a SMOAC Pro feature."
          : "Couldn’t update the request.",
      },
      { status: proRequired ? 402 : 403 }
    );
  }

  const relationship = mapCoachingRelationship(data as CoachingRelationshipRow);
  if (body.accept && relationship.status === "active") {
    const service = createSupabaseServiceClient();
    if (service) {
      const { data: profile } = await service
        .from("profiles")
        .select("email")
        .eq("user_id", relationship.clientUserId)
        .maybeSingle();
      const to = String(profile?.email ?? "").trim();
      if (to) {
        await sendRosterWelcomeEmail({
          to,
          clientFirstName: relationship.clientFirstName,
          specialistName: relationship.specialistName,
        });
      }
    }
  }

  return NextResponse.json({ ok: true, data: relationship });
}

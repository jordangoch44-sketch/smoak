import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapCoachingRelationship } from "@/lib/coaching/coach-workout";
import { sendRosterInviteEmail } from "@/lib/email/coaching-email-service";
import type { CoachingRelationshipRow } from "@/types/coaching";

export const runtime = "nodejs";

/** Specialist invites the client in one of their inquiry threads. RPC enforces ownership + Pro. */
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

  const body = (await request.json().catch(() => null)) as { conversationId?: unknown } | null;
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId.trim() : "";
  if (!conversationId) {
    return NextResponse.json({ ok: false, message: "Conversation not found." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("invite_client_to_roster", {
    p_conversation_id: conversationId,
  });
  if (error || !data) {
    const proRequired = error?.message.includes("pro_required");
    return NextResponse.json(
      {
        ok: false,
        message: proRequired
          ? "Rosters are a SMOAC Pro feature."
          : "You can’t add this client right now.",
      },
      { status: proRequired ? 402 : 403 }
    );
  }

  const relationship = mapCoachingRelationship(data as CoachingRelationshipRow);
  if (relationship.status === "invited") {
    const { data: conversation } = await supabase
      .from("inquiry_conversations")
      .select("client_email")
      .eq("id", conversationId)
      .maybeSingle();
    const to = String(conversation?.client_email ?? "").trim();
    if (to) {
      await sendRosterInviteEmail({
        to,
        clientFirstName: relationship.clientFirstName,
        specialistName: relationship.specialistName,
      });
    }
  }

  return NextResponse.json({ ok: true, data: relationship });
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  claimCoachingInviteLink,
  fetchCoachingInvitePreview,
  respondRosterInvite,
} from "@/lib/coaching/coaching-service";
import { sendRosterJoinedEmail, sendRosterWelcomeEmail } from "@/lib/email/coaching-email-service";
import type { CoachingRelationship } from "@/types/coaching";

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

  let relationship: CoachingRelationship;
  let isNew = true;

  if (token) {
    const preview = await fetchCoachingInvitePreview(supabase, token);
    if (preview) {
      const { data: existing } = await supabase
        .from("coaching_relationships")
        .select("status")
        .eq("specialist_id", preview.specialistId)
        .eq("client_user_id", user.id)
        .maybeSingle();
      isNew = preview.status !== "accepted" && existing?.status !== "active";
    }
    const result = await claimCoachingInviteLink(supabase, token);
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    relationship = result.data;
  } else if (relationshipId) {
    const result = await respondRosterInvite(supabase, relationshipId, true);
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    relationship = result.data;
  } else {
    return NextResponse.json({ ok: false, message: "Invite not found." }, { status: 400 });
  }

  if (isNew && relationship.status === "active") {
    await sendAcceptedEmails(relationship, user.email ?? "");
  }

  return NextResponse.json({ ok: true, data: relationship });
}

async function sendAcceptedEmails(relationship: CoachingRelationship, clientEmail: string) {
  const sends: Promise<unknown>[] = [];
  if (clientEmail.trim()) {
    sends.push(
      sendRosterWelcomeEmail({
        to: clientEmail,
        clientFirstName: relationship.clientFirstName,
        specialistName: relationship.specialistName,
      })
    );
  }
  const service = createSupabaseServiceClient();
  if (service && relationship.specialistUserId) {
    const { data } = await service.auth.admin.getUserById(relationship.specialistUserId);
    const to = data.user?.email?.trim();
    if (to) {
      sends.push(
        sendRosterJoinedEmail({
          to,
          clientFirstName: relationship.clientFirstName,
          specialistName: relationship.specialistName,
        })
      );
    }
  }
  await Promise.allSettled(sends);
}

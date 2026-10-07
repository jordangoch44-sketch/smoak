import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { mapCoachingRelationship } from "@/lib/coaching/coach-workout";
import {
  claimCoachingInviteLink,
  fetchCoachingInvitePreview,
  respondRosterInvite,
  type CoachingResult,
} from "@/lib/coaching/coaching-service";
import {
  COACHING_INVITE_TOKEN_META,
  readCoachingInviteToken,
} from "@/lib/coaching/invite-token";
import { sendRosterJoinedEmail, sendRosterWelcomeEmail } from "@/lib/email/coaching-email-service";
import type { CoachingRelationship, CoachingRelationshipRow } from "@/types/coaching";

const CLAIM_COPY = {
  invalid: "This invite link is no longer active.",
  claimed: "This invite link was already used by someone else.",
  expired: "This invite link has expired. Ask your specialist for a new one.",
  own: "This is your own invite link. Open it on your client’s phone instead.",
  failed: "Could not accept the invite.",
};

const TERMINAL_CLAIM =
  /no longer active|already used|has expired|your own invite/i;

/**
 * Client accepts a roster invite or claims a share link, then both sides get an email.
 * Repeat claims of the same link do not email again.
 */
export async function acceptCoachingInvite(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: { relationshipId?: string; token?: string }
): Promise<CoachingResult<CoachingRelationship>> {
  const relationshipId = input.relationshipId?.trim() ?? "";
  const token = input.token?.trim() ?? "";

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
    const result = await claimInviteLink(supabase, user.id, token);
    if (!result.ok) {
      if (TERMINAL_CLAIM.test(result.message)) {
        await clearInviteToken(supabase, user);
      }
      return result;
    }
    relationship = result.data;
    await clearInviteToken(supabase, user);
  } else if (relationshipId) {
    const result = await respondRosterInvite(supabase, relationshipId, true);
    if (!result.ok) return result;
    relationship = result.data;
  } else {
    return { ok: false, message: "Invite not found." };
  }

  if (isNew && relationship.status === "active") {
    await sendAcceptedEmails(relationship, user.email ?? "");
  }

  return { ok: true, data: relationship };
}

interface InviteLinkRow {
  token: string;
  specialist_id: string;
  specialist_user_id: string;
  specialist_name: string;
  client_first_name: string;
  expires_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
  revoked_at: string | null;
}

/**
 * Writes the roster row with the service role.
 * The database claim function looked up profiles.id, which does not exist.
 */
async function claimInviteLink(
  supabase: SupabaseClient,
  clientUserId: string,
  token: string
): Promise<CoachingResult<CoachingRelationship>> {
  const service = createSupabaseServiceClient();
  if (!service) return claimCoachingInviteLink(supabase, token);

  const { data, error } = await service
    .from("coaching_invite_links")
    .select(
      "token, specialist_id, specialist_user_id, specialist_name, client_first_name, expires_at, claimed_by, claimed_at, revoked_at"
    )
    .eq("token", token)
    .maybeSingle();
  const link = data as InviteLinkRow | null;
  if (error || !link || link.revoked_at) return { ok: false, message: CLAIM_COPY.invalid };
  if (link.claimed_by && link.claimed_by !== clientUserId) {
    return { ok: false, message: CLAIM_COPY.claimed };
  }
  if (!link.claimed_by && new Date(link.expires_at).getTime() < Date.now()) {
    return { ok: false, message: CLAIM_COPY.expired };
  }
  if (link.specialist_user_id === clientUserId) return { ok: false, message: CLAIM_COPY.own };

  if (!link.claimed_by) {
    const { data: reserved } = await service
      .from("coaching_invite_links")
      .update({ claimed_by: clientUserId, claimed_at: new Date().toISOString() })
      .eq("token", token)
      .is("claimed_by", null)
      .select("token");
    if (!reserved?.length) return { ok: false, message: CLAIM_COPY.claimed };
  }

  const { data: profile } = await service
    .from("profiles")
    .select("first_name")
    .eq("user_id", clientUserId)
    .maybeSingle();
  const firstName =
    String(profile?.first_name ?? "").trim() || link.client_first_name.trim();
  const now = new Date().toISOString();
  const { data: row, error: writeError } = await service
    .from("coaching_relationships")
    .upsert(
      {
        specialist_id: link.specialist_id,
        specialist_user_id: link.specialist_user_id,
        client_user_id: clientUserId,
        conversation_id: null,
        specialist_name: link.specialist_name,
        client_first_name: firstName,
        status: "active",
        responded_at: now,
        ended_at: null,
        updated_at: now,
      },
      { onConflict: "specialist_id,client_user_id" }
    )
    .select("*")
    .single();
  if (writeError || !row) {
    if (!link.claimed_by) {
      await service
        .from("coaching_invite_links")
        .update({ claimed_by: null, claimed_at: null })
        .eq("token", token)
        .eq("claimed_by", clientUserId);
    }
    return { ok: false, message: CLAIM_COPY.failed };
  }
  return { ok: true, data: mapCoachingRelationship(row as CoachingRelationshipRow) };
}

async function clearInviteToken(
  supabase: SupabaseClient,
  user: Pick<User, "user_metadata">
) {
  if (!readCoachingInviteToken(user.user_metadata)) return;
  try {
    await supabase.auth.updateUser({ data: { [COACHING_INVITE_TOKEN_META]: "" } });
  } catch {
    /* The roster row is already written. */
  }
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

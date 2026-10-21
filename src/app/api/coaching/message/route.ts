import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { resolveAvatarUrlFromProfile } from "@/lib/profiles/profile-avatar";
import { inquiryClosedMessage, inquiryPairIsBlocked } from "@/lib/trust/inquiry-block";
import type { ProfileRow } from "@/types/database";
import type { CoachingRelationshipRow } from "@/types/coaching";

export const runtime = "nodejs";

const OPENABLE = new Set(["invited", "active"]);

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  return (
    error?.code === "23505" || /duplicate key|unique constraint/i.test(error?.message ?? "")
  );
}

function isMissingAvatarColumn(message: string | undefined): boolean {
  return Boolean(message && /client_avatar_url/i.test(message));
}

async function clientIdentity(
  service: SupabaseClient,
  clientUserId: string,
  fallbackName: string
): Promise<{ email: string; firstName: string; avatarUrl: string }> {
  const { data } = await service
    .from("profiles")
    .select("email, first_name, avatar_url, avatar_path, onboarding_data")
    .eq("user_id", clientUserId)
    .maybeSingle();
  const profile = data as ProfileRow | null;
  let email = profile?.email?.trim() ?? "";
  if (!email) {
    const { data: authUser } = await service.auth.admin.getUserById(clientUserId);
    email = authUser.user?.email?.trim() ?? "";
  }
  return {
    email,
    firstName: fallbackName.trim() || profile?.first_name?.trim() || "Client",
    avatarUrl: resolveAvatarUrlFromProfile(profile) ?? "",
  };
}

async function findPairConversation(
  supabase: SupabaseClient,
  clientUserId: string,
  specialistId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("inquiry_conversations")
    .select("id")
    .eq("client_user_id", clientUserId)
    .eq("specialist_id", specialistId)
    .maybeSingle();
  const id = typeof data?.id === "string" ? data.id : "";
  return id || null;
}

/** Open the text thread for a roster client, creating one when none exists yet. */
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

  const body = (await request.json().catch(() => null)) as { relationshipId?: unknown } | null;
  const relationshipId =
    typeof body?.relationshipId === "string" ? body.relationshipId.trim() : "";
  if (!relationshipId) {
    return NextResponse.json({ ok: false, message: "Client not found." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("coaching_relationships")
    .select("*")
    .eq("id", relationshipId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ ok: false, message: "Client not found." }, { status: 404 });
  }

  const relationship = data as CoachingRelationshipRow;
  // RLS already limited this read to the client, the specialist who owns the
  // listing, or an admin. specialist_user_id can lag the signed-in owner.
  if (!OPENABLE.has(relationship.status)) {
    return NextResponse.json(
      { ok: false, message: "You can message this client once they’re connected." },
      { status: 400 }
    );
  }
  if (relationship.client_user_id === user.id) {
    return NextResponse.json(
      { ok: false, message: "You can’t message your own account." },
      { status: 400 }
    );
  }
  if (
    await inquiryPairIsBlocked(supabase, {
      partyA: user.id,
      partyB: relationship.client_user_id,
      specialistId: relationship.specialist_id,
    })
  ) {
    return NextResponse.json({ ok: false, message: inquiryClosedMessage() }, { status: 403 });
  }

  const service = createSupabaseServiceClient();
  const lookup = service ?? supabase;
  let conversationId =
    relationship.conversation_id ??
    (await findPairConversation(lookup, relationship.client_user_id, relationship.specialist_id));

  if (!conversationId) {
    if (!service) {
      return NextResponse.json(
        { ok: false, message: "Could not start a conversation." },
        { status: 503 }
      );
    }
    const identity = await clientIdentity(
      service,
      relationship.client_user_id,
      relationship.client_first_name
    );
    const now = new Date().toISOString();
    const insertRow: Record<string, unknown> = {
      client_user_id: relationship.client_user_id,
      specialist_id: relationship.specialist_id,
      specialist_user_id: relationship.specialist_user_id,
      specialist_name: relationship.specialist_name,
      inquiry_action: "",
      inquiry_topics: [],
      source: "roster",
      client_first_name: identity.firstName,
      client_email: identity.email,
      client_avatar_url: identity.avatarUrl,
      last_message_at: now,
      // Stay out of the client's inbox until the specialist actually sends.
      client_hidden_at: now,
    };

    let created = await service
      .from("inquiry_conversations")
      .insert(insertRow)
      .select("id")
      .single();
    if (created.error && isMissingAvatarColumn(created.error.message)) {
      delete insertRow.client_avatar_url;
      created = await service.from("inquiry_conversations").insert(insertRow).select("id").single();
    }
    if (created.error && /client_hidden_at/i.test(created.error.message)) {
      delete insertRow.client_hidden_at;
      created = await service.from("inquiry_conversations").insert(insertRow).select("id").single();
    }
    if (created.error && isUniqueViolation(created.error)) {
      conversationId = await findPairConversation(
        service,
        relationship.client_user_id,
        relationship.specialist_id
      );
    } else if (created.error || !created.data?.id) {
      console.error("[coaching/message] insert failed", created.error?.message);
      return NextResponse.json(
        { ok: false, message: "Could not start a conversation." },
        { status: 502 }
      );
    } else {
      conversationId = created.data.id as string;
    }
  }

  if (!conversationId) {
    return NextResponse.json(
      { ok: false, message: "Could not start a conversation." },
      { status: 502 }
    );
  }

  const writer = service ?? supabase;
  const { error: unhideError } = await writer
    .from("inquiry_conversations")
    .update({
      specialist_hidden_at: null,
      specialist_user_id: relationship.specialist_user_id,
    })
    .eq("id", conversationId);
  if (unhideError) {
    console.error("[coaching/message] unhide failed", unhideError.message);
  }
  if (service && relationship.conversation_id !== conversationId) {
    await service
      .from("coaching_relationships")
      .update({ conversation_id: conversationId, updated_at: new Date().toISOString() })
      .eq("id", relationship.id);
  }

  return NextResponse.json({ ok: true, data: { conversationId } });
}

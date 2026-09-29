import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveSpecialistUserId } from "@/lib/specialist-notify-email";
import {
  isDemoInquiryConversationId,
  isSmoacWelcomeConversationId,
} from "@/lib/inquiry/inquiry-paths";

export const runtime = "nodejs";

interface BlockBody {
  conversationId?: string;
  specialistId?: string;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Authentication is not available." },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in to block." },
      { status: 401 }
    );
  }

  let body: BlockBody;
  try {
    body = (await request.json()) as BlockBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request." },
      { status: 400 }
    );
  }

  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId.trim() : "";
  let specialistId =
    typeof body.specialistId === "string" ? body.specialistId.trim() : "";
  let blockedUserId: string | null = null;

  if (conversationId) {
    if (
      isDemoInquiryConversationId(conversationId) ||
      isSmoacWelcomeConversationId(conversationId)
    ) {
      return NextResponse.json(
        { ok: false, message: "This conversation cannot be blocked." },
        { status: 400 }
      );
    }
    const { data: conversation, error } = await supabase
      .from("inquiry_conversations")
      .select("client_user_id, specialist_user_id, specialist_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (error || !conversation) {
      return NextResponse.json(
        { ok: false, message: "Conversation not found." },
        { status: 404 }
      );
    }
    const clientId = String(conversation.client_user_id ?? "");
    const specialistUserId = String(conversation.specialist_user_id ?? "");
    specialistId = String(conversation.specialist_id ?? specialistId);
    const ownsListing =
      user.id !== clientId &&
      user.id !== specialistUserId &&
      specialistId
        ? Boolean(
            (
              await supabase
                .from("specialist_profiles")
                .select("id")
                .eq("id", specialistId)
                .eq("user_id", user.id)
                .maybeSingle()
            ).data?.id
          )
        : false;
    if (user.id !== clientId && user.id !== specialistUserId && !ownsListing) {
      return NextResponse.json(
        { ok: false, message: "You cannot block this conversation." },
        { status: 403 }
      );
    }
    const viewerIsClient = user.id === clientId;
    blockedUserId = viewerIsClient
      ? specialistUserId || (await resolveSpecialistUserId(supabase, specialistId))
      : clientId;
  } else if (specialistId) {
    blockedUserId = await resolveSpecialistUserId(supabase, specialistId);
  } else {
    return NextResponse.json(
      { ok: false, message: "Nothing to block." },
      { status: 400 }
    );
  }

  if (blockedUserId && blockedUserId === user.id) {
    return NextResponse.json(
      { ok: false, message: "You cannot block yourself." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("user_blocks").insert({
    blocker_user_id: user.id,
    blocked_user_id: blockedUserId,
    specialist_id: specialistId || null,
    conversation_id: conversationId || null,
  });

  if (error && !/23505|duplicate/i.test(error.message)) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

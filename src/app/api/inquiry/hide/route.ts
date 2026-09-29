import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isDemoInquiryConversationId,
  isSmoacWelcomeConversationId,
} from "@/lib/inquiry/inquiry-paths";

export const runtime = "nodejs";

interface HideBody {
  conversationId?: string;
  viewer?: "client" | "specialist";
}

/**
 * Hide a conversation from one inbox. The other party's thread stays.
 */
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
      { ok: false, message: "Sign in to update inquiries." },
      { status: 401 }
    );
  }

  let body: HideBody;
  try {
    body = (await request.json()) as HideBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request." },
      { status: 400 }
    );
  }

  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId.trim() : "";
  if (!conversationId) {
    return NextResponse.json(
      { ok: false, message: "Conversation not found." },
      { status: 400 }
    );
  }

  if (
    isDemoInquiryConversationId(conversationId) ||
    isSmoacWelcomeConversationId(conversationId)
  ) {
    return NextResponse.json({ ok: true, localOnly: true });
  }

  const { data: conversation, error: loadError } = await supabase
    .from("inquiry_conversations")
    .select("id, client_user_id, specialist_user_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (loadError || !conversation) {
    return NextResponse.json(
      { ok: false, message: loadError?.message ?? "Conversation not found." },
      { status: 404 }
    );
  }

  const viewer = body.viewer === "client" ? "client" : "specialist";
  const specialistUserId =
    typeof conversation.specialist_user_id === "string"
      ? conversation.specialist_user_id.trim()
      : "";

  if (viewer === "client") {
    if (conversation.client_user_id !== user.id) {
      return NextResponse.json(
        { ok: false, message: "Could not delete this conversation." },
        { status: 403 }
      );
    }
  } else if (
    conversation.client_user_id === user.id ||
    (specialistUserId && specialistUserId !== user.id)
  ) {
    return NextResponse.json(
      { ok: false, message: "Could not delete this conversation." },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const hiddenColumn =
    viewer === "client" ? "client_hidden_at" : "specialist_hidden_at";
  const unreadColumn =
    viewer === "client"
      ? "client_marked_unread_at"
      : "specialist_marked_unread_at";

  let { error } = await supabase
    .from("inquiry_conversations")
    .update({ [hiddenColumn]: now, [unreadColumn]: null })
    .eq("id", conversationId);

  if (
    error &&
    /marked_unread_at/i.test(error.message) &&
    /42703|column.*does not exist|PGRST204|schema cache/i.test(error.message)
  ) {
    const retry = await supabase
      .from("inquiry_conversations")
      .update({ [hiddenColumn]: now })
      .eq("id", conversationId);
    error = retry.error;
  }

  if (error) {
    if (
      /42703|column.*does not exist|PGRST204|schema cache/i.test(error.message)
    ) {
      return NextResponse.json({ ok: true, localOnly: true });
    }
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

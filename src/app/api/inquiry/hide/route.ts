import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoInquiryConversationId } from "@/lib/inquiry/inquiry-paths";

export const runtime = "nodejs";

interface HideBody {
  conversationId?: string;
}

/**
 * Hide a conversation from the specialist inbox. The client's thread stays.
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

  if (isDemoInquiryConversationId(conversationId)) {
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

  const specialistUserId =
    typeof conversation.specialist_user_id === "string"
      ? conversation.specialist_user_id.trim()
      : "";
  if (
    conversation.client_user_id === user.id ||
    (specialistUserId && specialistUserId !== user.id)
  ) {
    return NextResponse.json(
      { ok: false, message: "Could not delete this conversation." },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("inquiry_conversations")
    .update({ specialist_hidden_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) {
    if (/42703|column.*does not exist|PGRST204/i.test(error.message)) {
      return NextResponse.json({ ok: true, localOnly: true });
    }
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

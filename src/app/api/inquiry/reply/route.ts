import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { persistInquiryReply } from "@/lib/inquiry/inquiry-persist";
import { validateThreadMessage } from "@/lib/inquiry/inquiry-message-body";
import { resolveSpecialistUserId } from "@/lib/specialist-notify-email";
import type { InquiryConversationRow, SubmitInquiryReplyResult } from "@/types/inquiry";

export const runtime = "nodejs";

interface ReplyBody {
  conversationId?: string;
  message?: string;
}

/**
 * Authenticated thread reply. Session identity is the sender — clients and
 * specialists both write to inquiry_messages under RLS.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Authentication is not available." } satisfies SubmitInquiryReplyResult,
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in to send your message." } satisfies SubmitInquiryReplyResult,
      { status: 401 }
    );
  }

  let body: ReplyBody;
  try {
    body = (await request.json()) as ReplyBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request." } satisfies SubmitInquiryReplyResult,
      { status: 400 }
    );
  }

  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId.trim() : "";
  const validation = validateThreadMessage(
    typeof body.message === "string" ? body.message : ""
  );
  if (!conversationId) {
    return NextResponse.json(
      { ok: false, message: "Conversation not found." } satisfies SubmitInquiryReplyResult,
      { status: 400 }
    );
  }
  if (!validation.ok) {
    return NextResponse.json(validation satisfies SubmitInquiryReplyResult, {
      status: 400,
    });
  }

  const { data: conversation, error } = await supabase
    .from("inquiry_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conversation) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message ?? "Conversation not found.",
      } satisfies SubmitInquiryReplyResult,
      { status: 404 }
    );
  }

  const row = conversation as InquiryConversationRow;
  let senderRole: "client" | "specialist" | null = null;

  if (row.client_user_id === user.id) {
    senderRole = "client";
  } else {
    const specialistUserId =
      row.specialist_user_id ??
      (await resolveSpecialistUserId(supabase, row.specialist_id));
    if (specialistUserId === user.id) {
      senderRole = "specialist";
    }
  }

  if (!senderRole) {
    return NextResponse.json(
      {
        ok: false,
        message: "You cannot reply to this conversation.",
      } satisfies SubmitInquiryReplyResult,
      { status: 403 }
    );
  }

  const result = await persistInquiryReply(supabase, {
    conversationId,
    senderUserId: user.id,
    senderRole,
    message: validation.message,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result);
}

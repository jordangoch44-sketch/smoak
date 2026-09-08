import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isDemoInquiryConversationId } from "@/lib/inquiry/inquiry-paths";
import { labelsForInquiryTopics } from "@/lib/inquiry-options";
import { previewFromProfileRow } from "@/lib/inquiry/inquiry-client-preview";
import { fetchClientProfileEditorRow } from "@/lib/profiles/profile-service";
import type { InquiryConversationRow } from "@/types/inquiry";

export const runtime = "nodejs";

/**
 * Specialist-only snapshot of a client who already messaged them.
 * Never returns phone or email.
 */
export async function GET(request: Request) {
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
      { ok: false, message: "Sign in to view this profile." },
      { status: 401 }
    );
  }

  const conversationId = new URL(request.url).searchParams
    .get("conversationId")
    ?.trim();
  if (!conversationId) {
    return NextResponse.json(
      { ok: false, message: "Conversation not found." },
      { status: 400 }
    );
  }

  if (isDemoInquiryConversationId(conversationId)) {
    return NextResponse.json(
      { ok: false, message: "Demo conversation." },
      { status: 404 }
    );
  }

  const { data: conversation, error } = await supabase
    .from("inquiry_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !conversation) {
    return NextResponse.json(
      { ok: false, message: error?.message ?? "Conversation not found." },
      { status: 404 }
    );
  }

  const row = conversation as InquiryConversationRow;
  const specialistUserId = row.specialist_user_id?.trim() ?? "";
  if (row.client_user_id === user.id || (specialistUserId && specialistUserId !== user.id)) {
    return NextResponse.json(
      { ok: false, message: "Client profile is not available." },
      { status: 403 }
    );
  }

  const clientUserId = row.client_user_id?.trim() ?? "";
  if (!clientUserId) {
    return NextResponse.json(
      { ok: false, message: "Client profile is not available." },
      { status: 404 }
    );
  }

  const service = createSupabaseServiceClient() ?? supabase;
  const profile = await fetchClientProfileEditorRow(service, clientUserId);
  const topics = labelsForInquiryTopics(row.inquiry_topics ?? []);

  return NextResponse.json({
    ok: true,
    preview: previewFromProfileRow({
      conversationId: row.id,
      fallbackName: row.client_first_name || "Client",
      fallbackAvatarUrl: row.client_avatar_url?.trim() ?? "",
      inquiryTopics: topics,
      profile,
    }),
  });
}

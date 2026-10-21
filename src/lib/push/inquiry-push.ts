import type { SupabaseClient } from "@supabase/supabase-js";
import { inquiryThreadHref } from "@/lib/inquiry/inquiry-paths";
import { resolveSpecialistUserId } from "@/lib/specialist-notify-email";
import { sendUserPush } from "@/lib/push/send-user-push";

export async function sendInquiryMessagePush(input: {
  userId: string | null | undefined;
  senderName: string;
  message: string;
  viewer: "client" | "specialist";
  conversationId: string;
}): Promise<void> {
  const userId = input.userId?.trim() ?? "";
  if (!userId) return;
  const sender = input.senderName.trim() || "Someone";
  const preview = input.message.replace(/\s+/g, " ").trim();
  await sendUserPush({
    userId,
    title: "New message",
    body: preview ? `${sender}: ${preview}` : `${sender} sent you a message`,
    path: inquiryThreadHref(input.viewer, input.conversationId),
    collapseId: input.conversationId,
  });
}

/** New inquiry: the specialist's account receives the alert. */
export async function sendNewInquiryPush(
  supabase: SupabaseClient,
  input: {
    specialistId: string;
    senderName: string;
    message: string;
    conversationId: string;
  }
): Promise<void> {
  const userId = await resolveSpecialistUserId(supabase, input.specialistId);
  await sendInquiryMessagePush({
    userId,
    senderName: input.senderName,
    message: input.message,
    viewer: "specialist",
    conversationId: input.conversationId,
  });
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubmitInquiryInput, SubmitInquiryResult } from "@/types/inquiry";
import {
  sendInquiryClientConfirmationEmail,
  sendInquirySpecialistNotificationEmail,
} from "@/lib/email/inquiry-email-service";
import { formatInquiryMessageBody } from "@/lib/inquiry/inquiry-local-store";
import {
  sanitizeInquiryMessage,
} from "@/lib/pending-inquiry-storage";
import { CLIENT_DASHBOARD_PATH, SPECIALIST_DASHBOARD_PATH } from "@/lib/auth-routes";
import { getAuthSiteOrigin } from "@/lib/auth/site-origin";
import { buildLeaveReviewHref } from "@/lib/reviews/leave-review-href";
import {
  resolveSpecialistNotifyEmail,
  resolveSpecialistUserId,
} from "@/lib/specialist-notify-email";

function siteOrigin(): string {
  return getAuthSiteOrigin() ?? "https://smoac.com";
}

/**
 * Persist inquiry + send emails. Runs on the server with an authenticated
 * Supabase client (RLS). Does not touch browser localStorage.
 */
export async function persistSpecialistInquiry(
  supabase: SupabaseClient,
  input: SubmitInquiryInput
): Promise<SubmitInquiryResult> {
  const now = new Date().toISOString();
  const messageBody = formatInquiryMessageBody({
    inquiryAction: input.inquiryAction,
    inquiryTopics: input.inquiryTopics,
    message: input.message,
    clientFirstName: input.clientFirstName,
  });
  const specialistUserId = await resolveSpecialistUserId(
    supabase,
    input.specialistId
  );

  const { data: existing, error: existingError } = await supabase
    .from("inquiry_conversations")
    .select("id")
    .eq("client_user_id", input.clientUserId)
    .eq("specialist_id", input.specialistId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, message: existingError.message };
  }

  let conversationId = existing?.id as string | undefined;

  if (!conversationId) {
    const { data: created, error: createError } = await supabase
      .from("inquiry_conversations")
      .insert({
        client_user_id: input.clientUserId,
        specialist_id: input.specialistId,
        specialist_user_id: specialistUserId,
        specialist_name: input.specialistName,
        inquiry_action: input.inquiryAction,
        inquiry_topics: input.inquiryTopics,
        source: "specialist_profile",
        client_first_name: input.clientFirstName,
        client_email: input.clientEmail,
        last_message_at: now,
      })
      .select("id")
      .single();

    if (createError || !created?.id) {
      return {
        ok: false,
        message: createError?.message ?? "Could not create conversation.",
      };
    }
    conversationId = created.id;
  } else {
    /* Soft idempotency: identical body in the last 2 minutes → treat as already sent */
    const { data: recent } = await supabase
      .from("inquiry_messages")
      .select("id, body, created_at")
      .eq("conversation_id", conversationId)
      .eq("sender_role", "client")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      recent?.id &&
      recent.body === messageBody &&
      recent.created_at &&
      Date.now() - new Date(recent.created_at).getTime() < 120_000
    ) {
      return {
        ok: true,
        conversationId,
        messageId: recent.id as string,
        emailMode: "console",
        specialistEmailSent: false,
      };
    }

    const { error: updateError } = await supabase
      .from("inquiry_conversations")
      .update({
        specialist_user_id: specialistUserId,
        specialist_name: input.specialistName,
        inquiry_action: input.inquiryAction,
        inquiry_topics: input.inquiryTopics,
        client_first_name: input.clientFirstName,
        client_email: input.clientEmail,
        last_message_at: now,
        updated_at: now,
      })
      .eq("id", conversationId);

    if (updateError) {
      return { ok: false, message: updateError.message };
    }
  }

  const { data: message, error: messageError } = await supabase
    .from("inquiry_messages")
    .insert({
      conversation_id: conversationId,
      sender_user_id: input.clientUserId,
      sender_role: "client",
      body: messageBody,
      inquiry_action: input.inquiryAction,
      inquiry_topics: input.inquiryTopics,
      is_read: false,
    })
    .select("id")
    .single();

  if (messageError || !message?.id || !conversationId) {
    return {
      ok: false,
      message: messageError?.message ?? "Could not send message.",
    };
  }

  const origin = siteOrigin();
  const sanitizedMessage = sanitizeInquiryMessage(input.message);

  const clientEmailResult = await sendInquiryClientConfirmationEmail({
    to: input.clientEmail,
    clientFirstName: input.clientFirstName,
    specialistName: input.specialistName,
    inquiryAction: input.inquiryAction,
    inquiryTopics: input.inquiryTopics,
    message: sanitizedMessage,
    messagesPath: `${origin}${CLIENT_DASHBOARD_PATH}?tab=messages`,
    leaveReviewPath: `${origin}${buildLeaveReviewHref(input.specialistId)}`,
  });

  const specialistEmail = await resolveSpecialistNotifyEmail(
    supabase,
    input.specialistId,
    specialistUserId
  );
  let specialistEmailSent = false;
  let emailMode = clientEmailResult.mode ?? "console";
  if (specialistEmail) {
    const specialistResult = await sendInquirySpecialistNotificationEmail({
      to: specialistEmail,
      clientFirstName: input.clientFirstName,
      clientEmail: input.clientEmail,
      specialistName: input.specialistName,
      inquiryAction: input.inquiryAction,
      inquiryTopics: input.inquiryTopics,
      message: sanitizedMessage,
      dashboardPath: `${origin}${SPECIALIST_DASHBOARD_PATH}`,
    });
    specialistEmailSent = specialistResult.success;
    emailMode = specialistResult.mode ?? emailMode;
  } else {
    console.warn(
      "[SMOAC EMAIL] No specialist email found for inquiry notify",
      input.specialistId
    );
  }

  return {
    ok: true,
    conversationId,
    messageId: message.id as string,
    emailMode,
    specialistEmailSent,
  };
}

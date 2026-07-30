import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubmitInquiryInput, SubmitInquiryResult } from "@/types/inquiry";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import {
  sendInquiryClientConfirmationEmail,
  sendInquirySpecialistNotificationEmail,
} from "@/lib/email/inquiry-email-service";
import { trackInquiryEvent } from "@/lib/inquiry/inquiry-analytics";
import {
  formatInquiryMessageBody,
  saveLocalInquiry,
} from "@/lib/inquiry/inquiry-local-store";
import {
  createInquiryIdempotencyKey,
  readLastInquiryIdempotencyKey,
  writeLastInquiryIdempotencyKey,
} from "@/lib/inquiry/inquiry-session-flags";
import { pushSpecialistInquiryNotification } from "@/lib/inquiry/specialist-inquiry-notifications";
import {
  sanitizeInquiryMessage,
  validateInquiryDraft,
  type PendingInquiryDraft,
} from "@/lib/pending-inquiry-storage";
import { getSpecialistApplicationById } from "@/lib/specialist-application-storage";
import { CLIENT_DASHBOARD_PATH, SPECIALIST_DASHBOARD_PATH } from "@/lib/auth-routes";
import { getAuthSiteOrigin } from "@/lib/auth/site-origin";
import { labelsForInquiryTopics, labelForInquiryAction } from "@/lib/inquiry-options";
import { buildLeaveReviewHref } from "@/lib/reviews/leave-review-href";

async function resolveSpecialistUserId(
  supabase: SupabaseClient,
  specialistId: string
): Promise<string | null> {
  const { data: application } = await supabase
    .from("specialist_applications")
    .select("user_id")
    .eq("id", specialistId)
    .maybeSingle();

  const fromApp = application?.user_id;
  if (typeof fromApp === "string" && fromApp.trim()) {
    return fromApp.trim();
  }

  const { data: profile } = await supabase
    .from("specialist_profiles")
    .select("user_id")
    .eq("id", specialistId)
    .maybeSingle();

  const fromProfile = profile?.user_id;
  return typeof fromProfile === "string" && fromProfile.trim()
    ? fromProfile.trim()
    : null;
}

async function resolveSpecialistNotifyEmail(
  supabase: SupabaseClient,
  specialistId: string,
  specialistUserId: string | null
): Promise<string | null> {
  if (specialistUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", specialistUserId)
      .maybeSingle();
    if (typeof profile?.email === "string" && profile.email.trim()) {
      return profile.email.trim().toLowerCase();
    }
  }

  const { data: application } = await supabase
    .from("specialist_applications")
    .select("email")
    .eq("id", specialistId)
    .maybeSingle();

  if (typeof application?.email === "string" && application.email.trim()) {
    return application.email.trim().toLowerCase();
  }

  const { data: listing } = await supabase
    .from("specialist_profiles")
    .select("profile_data")
    .eq("id", specialistId)
    .maybeSingle();

  const listingEmail =
    listing &&
    typeof listing === "object" &&
    listing.profile_data &&
    typeof listing.profile_data === "object" &&
    "email" in (listing.profile_data as object)
      ? String((listing.profile_data as { email?: string }).email ?? "").trim()
      : "";

  return listingEmail.includes("@") ? listingEmail.toLowerCase() : null;
}

function resolveLocalSpecialistNotifyEmail(specialistId: string): string | null {
  const application = getSpecialistApplicationById(specialistId);
  const email = application?.email?.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}

function notifySpecialistPortal(input: {
  specialistId: string;
  conversationId: string;
  clientFirstName: string;
  inquiryAction: SubmitInquiryInput["inquiryAction"];
  inquiryTopics: string[];
}): void {
  const action = labelForInquiryAction(input.inquiryAction);
  const topics = labelsForInquiryTopics(input.inquiryTopics);
  const summary =
    topics.length > 0 ? `${action} · ${topics.slice(0, 2).join(", ")}` : action;

  pushSpecialistInquiryNotification({
    specialistId: input.specialistId,
    conversationId: input.conversationId,
    clientFirstName: input.clientFirstName,
    summary,
  });
}

function siteOrigin(): string {
  return getAuthSiteOrigin();
}

async function submitInquiryViaSupabase(
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

  notifySpecialistPortal({
    specialistId: input.specialistId,
    conversationId,
    clientFirstName: input.clientFirstName,
    inquiryAction: input.inquiryAction,
    inquiryTopics: input.inquiryTopics,
  });

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

/** Submit a verified inquiry for an authenticated client. */
export async function submitSpecialistInquiry(
  input: SubmitInquiryInput
): Promise<SubmitInquiryResult> {
  const validation = validateInquiryDraft(input);
  if (!validation.ok) {
    trackInquiryEvent("inquiry_failed", { reason: "validation" });
    return validation;
  }

  const normalized: SubmitInquiryInput = {
    ...input,
    message: sanitizeInquiryMessage(input.message),
    clientEmail: input.clientEmail.trim().toLowerCase(),
    clientFirstName: input.clientFirstName.trim(),
    specialistId: input.specialistId.trim(),
  };

  if (input.idempotencyKey) {
    const last = readLastInquiryIdempotencyKey();
    if (last && last === input.idempotencyKey) {
      return {
        ok: false,
        message: "This message was already sent. Check your messages.",
      };
    }
  }

  try {
    if (isMarketplaceSupabaseActive()) {
      const supabase = getMarketplaceAuthClient();
      if (!supabase) {
        trackInquiryEvent("inquiry_failed", { reason: "no_client" });
        return { ok: false, message: "Authentication is not available." };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.id !== normalized.clientUserId) {
        trackInquiryEvent("inquiry_failed", { reason: "auth_mismatch" });
        return {
          ok: false,
          message: "Sign in to send your message.",
        };
      }

      const result = await submitInquiryViaSupabase(supabase, normalized);
      if (result.ok && input.idempotencyKey) {
        writeLastInquiryIdempotencyKey(input.idempotencyKey);
      }
      if (result.ok) {
        trackInquiryEvent("inquiry_sent", {
          specialistId: normalized.specialistId,
        });
      } else {
        trackInquiryEvent("inquiry_failed", { reason: result.message });
      }
      return result;
    }

    const local = saveLocalInquiry(normalized);
    if (input.idempotencyKey) {
      writeLastInquiryIdempotencyKey(input.idempotencyKey);
    }

    notifySpecialistPortal({
      specialistId: normalized.specialistId,
      conversationId: local.conversationId,
      clientFirstName: normalized.clientFirstName,
      inquiryAction: normalized.inquiryAction,
      inquiryTopics: normalized.inquiryTopics,
    });

    const origin = siteOrigin();
    const clientEmailResult = await sendInquiryClientConfirmationEmail({
      to: normalized.clientEmail,
      clientFirstName: normalized.clientFirstName,
      specialistName: normalized.specialistName,
      inquiryAction: normalized.inquiryAction,
      inquiryTopics: normalized.inquiryTopics,
      message: normalized.message,
      messagesPath: `${origin}${CLIENT_DASHBOARD_PATH}?tab=messages`,
      leaveReviewPath: `${origin}${buildLeaveReviewHref(normalized.specialistId)}`,
    });

    const specialistEmail = resolveLocalSpecialistNotifyEmail(
      normalized.specialistId
    );
    let specialistEmailSent = false;
    let emailMode = clientEmailResult.mode ?? "console";
    if (specialistEmail) {
      const specialistResult = await sendInquirySpecialistNotificationEmail({
        to: specialistEmail,
        clientFirstName: normalized.clientFirstName,
        clientEmail: normalized.clientEmail,
        specialistName: normalized.specialistName,
        inquiryAction: normalized.inquiryAction,
        inquiryTopics: normalized.inquiryTopics,
        message: normalized.message,
        dashboardPath: `${origin}${SPECIALIST_DASHBOARD_PATH}`,
      });
      specialistEmailSent = specialistResult.success;
      emailMode = specialistResult.mode ?? emailMode;
    } else {
      console.warn(
        "[SMOAC EMAIL] No specialist email found for local inquiry notify",
        normalized.specialistId
      );
    }

    trackInquiryEvent("inquiry_sent", {
      specialistId: normalized.specialistId,
      local: true,
    });
    return {
      ok: true,
      conversationId: local.conversationId,
      messageId: local.messageId,
      emailMode,
      specialistEmailSent,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send your message.";
    trackInquiryEvent("inquiry_failed", { reason: message });
    return { ok: false, message };
  }
}

export function draftToSubmitInput(
  draft: PendingInquiryDraft,
  client: {
    userId: string;
    firstName: string;
    email: string;
  }
): SubmitInquiryInput {
  return {
    specialistId: draft.specialistId,
    specialistName: draft.specialistName,
    inquiryAction: draft.inquiryAction,
    inquiryTopics: draft.inquiryTopics,
    message: draft.message,
    clientUserId: client.userId,
    clientFirstName: client.firstName,
    clientEmail: client.email,
    idempotencyKey: createInquiryIdempotencyKey(draft),
  };
}

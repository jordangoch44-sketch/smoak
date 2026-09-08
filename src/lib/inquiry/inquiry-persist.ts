import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InquiryConversationRow,
  SubmitInquiryInput,
  SubmitInquiryReplyResult,
  SubmitInquiryResult,
} from "@/types/inquiry";
import { sendInquiryMessageReceivedEmail } from "@/lib/email/inquiry-email-service";
import { composeInquiryThreadBody } from "@/lib/inquiry/inquiry-message-body";
import { inquiryThreadHref } from "@/lib/inquiry/inquiry-paths";
import { resolveSpecialistListingAvatar } from "@/lib/inquiry/inquiry-avatars";
import { isInquiryActionId } from "@/lib/inquiry-options";
import { resolveAvatarUrlFromProfile } from "@/lib/profiles/profile-avatar";
import type { ProfileRow } from "@/types/database";
import { getAuthSiteOrigin } from "@/lib/auth/site-origin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  resolveSpecialistNotifyEmail,
  resolveSpecialistUserId,
} from "@/lib/specialist-notify-email";

function siteOrigin(): string {
  return getAuthSiteOrigin() ?? "https://smoac.com";
}

function isMissingAvatarColumnError(message: string | undefined): boolean {
  return Boolean(message && /client_avatar_url/i.test(message));
}

async function resolveClientAvatarUrl(
  supabase: SupabaseClient,
  clientUserId: string,
  fallback?: string
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("avatar_url, avatar_path, onboarding_data")
    .eq("user_id", clientUserId)
    .maybeSingle();
  const fromProfile = resolveAvatarUrlFromProfile(data as ProfileRow | null);
  if (fromProfile) return fromProfile;
  const extra = fallback?.trim() ?? "";
  if (extra && !extra.toLowerCase().startsWith("data:")) return extra;
  return "";
}

function publicPhotoUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.toLowerCase().startsWith("data:")) return "";
  return trimmed;
}

function photoFromProfileData(profileData: unknown): string {
  if (!profileData || typeof profileData !== "object") return "";
  const data = profileData as Record<string, unknown>;
  const image = typeof data.image === "string" ? data.image : "";
  const hero = typeof data.heroImage === "string" ? data.heroImage : "";
  const gallery = Array.isArray(data.galleryImages) ? data.galleryImages : [];
  const firstGallery = typeof gallery[0] === "string" ? gallery[0] : "";
  return (
    publicPhotoUrl(image) ||
    publicPhotoUrl(hero) ||
    publicPhotoUrl(firstGallery)
  );
}

async function resolveSpecialistAvatarUrl(
  supabase: SupabaseClient,
  specialistId: string,
  specialistUserId: string | null
): Promise<string> {
  const listing = resolveSpecialistListingAvatar(specialistId);
  if (listing) return listing;

  const db = createSupabaseServiceClient() ?? supabase;
  const { data: profileRow } = await db
    .from("specialist_profiles")
    .select("profile_data")
    .eq("id", specialistId)
    .maybeSingle();
  const fromListing = photoFromProfileData(
    (profileRow as { profile_data?: unknown } | null)?.profile_data
  );
  if (fromListing) return fromListing;

  if (!specialistUserId) return "";
  const { data } = await db
    .from("profiles")
    .select("avatar_url, avatar_path, onboarding_data")
    .eq("user_id", specialistUserId)
    .maybeSingle();
  return resolveAvatarUrlFromProfile(data as ProfileRow | null) ?? "";
}

async function notifyRecipient(input: {
  to: string;
  kind: "inquiry_client" | "inquiry_specialist";
  recipientFirstName: string;
  senderName: string;
  senderAvatarUrl?: string;
  message: string;
  viewer: "client" | "specialist";
  conversationId: string;
  inquiryAction?: string;
  inquiryTopics?: string[];
}): Promise<{ success: boolean; mode?: "resend" | "console" }> {
  const origin = siteOrigin();
  const action = input.inquiryAction;
  return sendInquiryMessageReceivedEmail({
    to: input.to,
    kind: input.kind,
    recipientFirstName: input.recipientFirstName,
    senderName: input.senderName,
    senderAvatarUrl: input.senderAvatarUrl,
    message: input.message,
    threadPath: `${origin}${inquiryThreadHref(input.viewer, input.conversationId)}`,
    inquiryAction: action && isInquiryActionId(action) ? action : undefined,
    inquiryTopics: input.inquiryTopics,
  });
}

/**
 * Persist inquiry + notify the specialist. Runs on the server with an
 * authenticated Supabase client (RLS). Does not touch browser localStorage.
 */
export async function persistSpecialistInquiry(
  supabase: SupabaseClient,
  input: SubmitInquiryInput
): Promise<SubmitInquiryResult> {
  const now = new Date().toISOString();
  const messageBody = composeInquiryThreadBody({
    inquiryAction: input.inquiryAction,
    inquiryTopics: input.inquiryTopics,
    message: input.message,
  });
  const specialistUserId = await resolveSpecialistUserId(
    supabase,
    input.specialistId
  );
  const clientAvatarUrl = await resolveClientAvatarUrl(
    supabase,
    input.clientUserId,
    input.clientAvatarUrl
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

  const conversationFields = {
    specialist_user_id: specialistUserId,
    specialist_name: input.specialistName,
    inquiry_action: input.inquiryAction,
    inquiry_topics: input.inquiryTopics,
    client_first_name: input.clientFirstName,
    client_email: input.clientEmail,
    last_message_at: now,
    client_avatar_url: clientAvatarUrl,
  };

  if (!conversationId) {
    const insertRow = {
      client_user_id: input.clientUserId,
      specialist_id: input.specialistId,
      source: "specialist_profile",
      ...conversationFields,
    };
    let created = (
      await supabase
        .from("inquiry_conversations")
        .insert(insertRow)
        .select("id")
        .single()
    ) as { data: { id: string } | null; error: { message: string } | null };

    if (created.error && isMissingAvatarColumnError(created.error.message)) {
      const { client_avatar_url: _omit, ...withoutAvatar } = insertRow;
      created = await supabase
        .from("inquiry_conversations")
        .insert(withoutAvatar)
        .select("id")
        .single();
    }

    if (created.error || !created.data?.id) {
      return {
        ok: false,
        message: created.error?.message ?? "Could not create conversation.",
      };
    }
    conversationId = created.data.id;
  } else {
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

    const updateRow = { ...conversationFields, updated_at: now };
    let { error: updateError } = await supabase
      .from("inquiry_conversations")
      .update(updateRow)
      .eq("id", conversationId);

    if (updateError && isMissingAvatarColumnError(updateError.message)) {
      const { client_avatar_url: _omit, ...withoutAvatar } = updateRow;
      const retry = await supabase
        .from("inquiry_conversations")
        .update(withoutAvatar)
        .eq("id", conversationId);
      updateError = retry.error;
    }

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

  const specialistEmail = await resolveSpecialistNotifyEmail(
    supabase,
    input.specialistId,
    specialistUserId
  );
  let specialistEmailSent = false;
  let emailMode: "resend" | "console" = "console";
  if (specialistEmail) {
    const specialistFirst =
      input.specialistName.trim().split(/\s+/)[0] || "there";
    const specialistResult = await notifyRecipient({
      to: specialistEmail,
      kind: "inquiry_specialist",
      recipientFirstName: specialistFirst,
      senderName: input.clientFirstName,
      senderAvatarUrl: clientAvatarUrl,
      message: messageBody,
      viewer: "specialist",
      conversationId,
      inquiryAction: input.inquiryAction,
      inquiryTopics: input.inquiryTopics,
    });
    specialistEmailSent = specialistResult.success;
    emailMode = specialistResult.mode ?? emailMode;
  } else {
    console.warn(
      "[SMOAC EMAIL] No specialist email found for inquiry notify",
      { specialistId: input.specialistId, specialistUserId }
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

export async function persistInquiryReply(
  supabase: SupabaseClient,
  input: {
    conversationId: string;
    senderUserId: string;
    senderRole: "client" | "specialist";
    message: string;
  }
): Promise<SubmitInquiryReplyResult> {
  const { data: conversation, error: conversationError } = await supabase
    .from("inquiry_conversations")
    .select("*")
    .eq("id", input.conversationId)
    .maybeSingle();

  if (conversationError || !conversation) {
    return {
      ok: false,
      message: conversationError?.message ?? "Conversation not found.",
    };
  }

  const row = conversation as InquiryConversationRow;
  const now = new Date().toISOString();

  const { data: message, error: messageError } = await supabase
    .from("inquiry_messages")
    .insert({
      conversation_id: row.id,
      sender_user_id: input.senderUserId,
      sender_role: input.senderRole,
      body: input.message,
      is_read: false,
    })
    .select("id")
    .single();

  if (messageError || !message?.id) {
    return {
      ok: false,
      message: messageError?.message ?? "Could not send message.",
    };
  }

  const conversationPatch: Record<string, string> = {
    last_message_at: now,
    updated_at: now,
  };
  if (input.senderRole === "specialist" && !row.specialist_user_id) {
    conversationPatch.specialist_user_id = input.senderUserId;
  }

  await supabase
    .from("inquiry_conversations")
    .update(conversationPatch)
    .eq("id", row.id);

  let emailMode: "resend" | "console" = "console";
  if (input.senderRole === "client") {
    const specialistUserId =
      row.specialist_user_id ??
      (await resolveSpecialistUserId(supabase, row.specialist_id));
    const specialistEmail = await resolveSpecialistNotifyEmail(
      supabase,
      row.specialist_id,
      specialistUserId
    );
    if (specialistEmail) {
      const specialistFirst =
        row.specialist_name.trim().split(/\s+/)[0] || "there";
      const result = await notifyRecipient({
        to: specialistEmail,
        kind: "inquiry_specialist",
        recipientFirstName: specialistFirst,
        senderName: row.client_first_name,
        senderAvatarUrl: row.client_avatar_url,
        message: input.message,
        viewer: "specialist",
        conversationId: row.id,
      });
      emailMode = result.mode ?? emailMode;
    } else {
      console.warn(
        "[SMOAC EMAIL] No specialist email found for reply notify",
        { specialistId: row.specialist_id, specialistUserId }
      );
    }
  } else {
    const clientEmail = row.client_email.trim().toLowerCase();
    if (clientEmail.includes("@")) {
      const specialistUserId =
        row.specialist_user_id ??
        (input.senderRole === "specialist" ? input.senderUserId : null);
      const specialistAvatarUrl = await resolveSpecialistAvatarUrl(
        supabase,
        row.specialist_id,
        specialistUserId
      );
      const result = await notifyRecipient({
        to: clientEmail,
        kind: "inquiry_client",
        recipientFirstName: row.client_first_name,
        senderName: row.specialist_name,
        senderAvatarUrl: specialistAvatarUrl,
        message: input.message,
        viewer: "client",
        conversationId: row.id,
      });
      emailMode = result.mode ?? emailMode;
    }
  }

  return {
    ok: true,
    conversationId: row.id,
    messageId: message.id as string,
    emailMode,
  };
}

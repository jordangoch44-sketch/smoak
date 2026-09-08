import type { SubmitInquiryInput, SubmitInquiryResult, SubmitInquiryReplyResult } from "@/types/inquiry";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { sendInquiryMessageReceivedEmail } from "@/lib/email/inquiry-email-service";
import { trackInquiryEvent } from "@/lib/inquiry/inquiry-analytics";
import { persistSpecialistInquiry } from "@/lib/inquiry/inquiry-persist";
import {
  saveLocalInquiry,
  saveLocalReply,
} from "@/lib/inquiry/inquiry-local-store";
import {
  createInquiryIdempotencyKey,
  readLastInquiryIdempotencyKey,
  writeLastInquiryIdempotencyKey,
} from "@/lib/inquiry/inquiry-session-flags";
import { pushSpecialistInquiryNotification } from "@/lib/inquiry/specialist-inquiry-notifications";
import {
  composeInquiryThreadBody,
  validateThreadMessage,
} from "@/lib/inquiry/inquiry-message-body";
import { inquiryThreadHref } from "@/lib/inquiry/inquiry-paths";
import {
  validateInquiryDraft,
  type PendingInquiryDraft,
} from "@/lib/pending-inquiry-storage";
import { getSpecialistApplicationById } from "@/lib/specialist-application-storage";
import { getAuthSiteOrigin } from "@/lib/auth/site-origin";
import { labelsForInquiryTopics, labelForInquiryAction } from "@/lib/inquiry-options";

function dispatchInquiryUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("smoac:inquiry-updated"));
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
  dispatchInquiryUpdated();
}

function resolveLocalSpecialistNotifyEmail(specialistId: string): string | null {
  const application = getSpecialistApplicationById(specialistId);
  const email = application?.email?.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}

function siteOrigin(): string {
  return getAuthSiteOrigin() ?? "https://smoac.com";
}

async function submitInquiryViaApi(
  input: SubmitInquiryInput
): Promise<SubmitInquiryResult> {
  const response = await fetch("/api/inquiry/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      specialistId: input.specialistId,
      specialistName: input.specialistName,
      inquiryAction: input.inquiryAction,
      inquiryTopics: input.inquiryTopics,
      message: input.message,
      clientFirstName: input.clientFirstName,
      idempotencyKey: input.idempotencyKey,
    }),
  });

  const data = (await response.json().catch(() => null)) as SubmitInquiryResult | null;
  if (data && typeof data === "object" && "ok" in data) {
    return data;
  }

  return {
    ok: false,
    message:
      response.status === 401
        ? "Sign in to send your message."
        : "Could not send your message. Try again.",
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
    message: composeInquiryThreadBody(input),
    clientEmail: input.clientEmail.trim().toLowerCase(),
    clientFirstName: input.clientFirstName.trim(),
    specialistId: input.specialistId.trim(),
  };

  if (input.idempotencyKey) {
    const last = readLastInquiryIdempotencyKey();
    if (last && last === input.idempotencyKey) {
      return {
        ok: false,
        message: "This message was already sent. Check your inquiries.",
      };
    }
  }

  try {
    if (isMarketplaceSupabaseActive()) {
      if (typeof window !== "undefined") {
        const result = await submitInquiryViaApi(normalized);
        if (result.ok) {
          if (input.idempotencyKey) {
            writeLastInquiryIdempotencyKey(input.idempotencyKey);
          }
          notifySpecialistPortal({
            specialistId: normalized.specialistId,
            conversationId: result.conversationId,
            clientFirstName: normalized.clientFirstName,
            inquiryAction: normalized.inquiryAction,
            inquiryTopics: normalized.inquiryTopics,
          });
          trackInquiryEvent("inquiry_sent", {
            specialistId: normalized.specialistId,
          });
        } else {
          trackInquiryEvent("inquiry_failed", { reason: result.message });
        }
        return result;
      }

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

      const result = await persistSpecialistInquiry(supabase, normalized);
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
    const specialistEmail = resolveLocalSpecialistNotifyEmail(
      normalized.specialistId
    );
    let specialistEmailSent = false;
    let emailMode: "resend" | "console" = "console";
    if (specialistEmail) {
      const specialistFirst =
        normalized.specialistName.trim().split(/\s+/)[0] || "there";
      const specialistResult = await sendInquiryMessageReceivedEmail({
        to: specialistEmail,
        kind: "inquiry_specialist",
        recipientFirstName: specialistFirst,
        senderName: normalized.clientFirstName,
        senderAvatarUrl: normalized.clientAvatarUrl,
        message: normalized.message,
        threadPath: `${origin}${inquiryThreadHref("specialist", local.conversationId)}`,
        inquiryAction: normalized.inquiryAction,
        inquiryTopics: normalized.inquiryTopics,
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

export async function submitInquiryReply(input: {
  conversationId: string;
  message: string;
  senderUserId: string;
  senderRole: "client" | "specialist";
  specialistId?: string;
  clientFirstName?: string;
}): Promise<SubmitInquiryReplyResult> {
  const validation = validateThreadMessage(input.message);
  if (!validation.ok) {
    return validation;
  }

  try {
    if (isMarketplaceSupabaseActive() && typeof window !== "undefined") {
      const response = await fetch("/api/inquiry/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          conversationId: input.conversationId,
          message: validation.message,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | SubmitInquiryReplyResult
        | null;
      if (data && typeof data === "object" && "ok" in data) {
        if (data.ok) dispatchInquiryUpdated();
        return data;
      }
      return {
        ok: false,
        message:
          response.status === 401
            ? "Sign in to send your message."
            : "Could not send your message. Try again.",
      };
    }

    const local = saveLocalReply({
      conversationId: input.conversationId,
      senderUserId: input.senderUserId,
      senderRole: input.senderRole,
      message: validation.message,
    });
    if (!local) {
      return { ok: false, message: "Conversation not found." };
    }
    if (input.senderRole === "client" && input.specialistId) {
      notifySpecialistPortal({
        specialistId: input.specialistId,
        conversationId: local.conversationId,
        clientFirstName: input.clientFirstName || "Client",
        inquiryAction: "ask_question",
        inquiryTopics: [],
      });
    } else {
      dispatchInquiryUpdated();
    }
    return {
      ok: true,
      conversationId: local.conversationId,
      messageId: local.messageId,
      emailMode: "console",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send your message.";
    return { ok: false, message };
  }
}

export function draftToSubmitInput(
  draft: PendingInquiryDraft,
  client: {
    userId: string;
    firstName: string;
    email: string;
    avatarUrl?: string;
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
    clientAvatarUrl: client.avatarUrl,
    idempotencyKey: createInquiryIdempotencyKey(draft),
  };
}

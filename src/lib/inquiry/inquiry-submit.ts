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
import { persistSpecialistInquiry } from "@/lib/inquiry/inquiry-persist";
import {
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

function resolveLocalSpecialistNotifyEmail(specialistId: string): string | null {
  const application = getSpecialistApplicationById(specialistId);
  const email = application?.email?.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}

function siteOrigin(): string {
  return getAuthSiteOrigin();
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
        message: "This message was already sent. Check your inquiries.",
      };
    }
  }

  try {
    if (isMarketplaceSupabaseActive()) {
      /* Browser: prefer authenticated API (server writes + emails). */
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

      /* Server-side callers (rare): persist directly with user client. */
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

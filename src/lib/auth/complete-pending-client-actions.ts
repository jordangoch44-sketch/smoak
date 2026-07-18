import {
  bootstrapInquiryClientFromPendingSignup,
  ensureInquiryClientProfileAfterAuth,
} from "@/lib/auth/inquiry-auth";
import { setAuthSession } from "@/lib/auth-session-store";
import {
  clearInquiryAutoSendFlag,
  peekInquiryAutoSendFlag,
  peekSaveAutoApplyFlag,
} from "@/lib/inquiry/inquiry-session-flags";
import {
  draftToSubmitInput,
  submitSpecialistInquiry,
} from "@/lib/inquiry/inquiry-submit";
import {
  clearPendingInquiryDraft,
  peekPendingInquiryDraft,
} from "@/lib/pending-inquiry-storage";
import { applyPendingSaveAfterLogin } from "@/lib/specialist-saves";
import { emitSaveApplied } from "@/lib/save-applied-events";
import { showToast } from "@/lib/toast-store";
import type { AuthSession } from "@/types/auth";

export type PendingClientActionResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };

/**
 * Ensures client profile exists and flushes pending inquiry/save after account setup.
 */
export async function flushPendingClientActions(
  session: AuthSession,
  options?: { inquiry?: boolean; save?: boolean }
): Promise<PendingClientActionResult> {
  let active: AuthSession | null = session;

  if (!active || active.role !== "client") {
    const bootstrapped = await bootstrapInquiryClientFromPendingSignup();
    if (bootstrapped.ok === true) {
      active = bootstrapped.session;
      setAuthSession(active);
    } else if (bootstrapped.ok === false) {
      return { ok: false, message: bootstrapped.message };
    }
  }

  if (!active || active.role !== "client") {
    return { ok: false, message: "Client session required." };
  }

  const ensured = await ensureInquiryClientProfileAfterAuth(active);
  if (!ensured.ok) {
    return { ok: false, message: ensured.message };
  }
  active = ensured.session;
  setAuthSession(active);

  const shouldInquiry =
    options?.inquiry === true || peekInquiryAutoSendFlag();
  const shouldSave = options?.save === true || peekSaveAutoApplyFlag();

  if (shouldInquiry) {
    const draft = peekPendingInquiryDraft();
    if (draft) {
      const result = await submitSpecialistInquiry(
        draftToSubmitInput(draft, {
          userId: active.userId,
          firstName: active.firstName?.trim() || "Client",
          email: active.email,
        })
      );

      if (!result.ok) {
        return { ok: false, message: result.message };
      }

      clearPendingInquiryDraft();
      clearInquiryAutoSendFlag();
      showToast({
        type: "success",
        message: `Message sent to ${draft.specialistName}.`,
      });
    } else {
      clearInquiryAutoSendFlag();
    }
  }

  if (shouldSave) {
    const applied = await applyPendingSaveAfterLogin("client");
    if (applied.kind === "client-saved") {
      emitSaveApplied(
        applied.record ?? {
          specialistId: applied.specialistId,
          actionType: "save_specialist",
          createdAt: new Date().toISOString(),
        }
      );
    } else if (applied.kind === "specialist-blocked") {
      showToast({
        type: "info",
        message: "Switch to a client account to save specialists.",
      });
    }
  }

  return { ok: true, session: active };
}

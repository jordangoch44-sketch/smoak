"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
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

/**
 * After magic-link / OTP return: ensure lightweight client profile and flush
 * pending inquiry draft and/or pending save — without full onboarding.
 */
export function InquiryAutoSendBridge() {
  const { session, isReady, refreshSession } = useAuthSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const inquiryRunningRef = useRef(false);
  const saveRunningRef = useRef(false);

  useEffect(() => {
    if (!isReady) return;
    if (!peekInquiryAutoSendFlag() && searchParams.get("inquiry") !== "1") {
      return;
    }
    if (inquiryRunningRef.current) return;

    const draft = peekPendingInquiryDraft();
    if (!draft) {
      clearInquiryAutoSendFlag();
      return;
    }

    inquiryRunningRef.current = true;

    void (async () => {
      try {
        let active: AuthSession | null = session;

        if (!active || active.role !== "client") {
          const bootstrapped = await bootstrapInquiryClientFromPendingSignup();
          if (bootstrapped.ok === true) {
            active = bootstrapped.session;
            setAuthSession(active);
          } else if (bootstrapped.ok === false) {
            showToast({ type: "info", message: bootstrapped.message });
            return;
          }
        }

        if (!active || active.role !== "client") {
          return;
        }

        const ensured = await ensureInquiryClientProfileAfterAuth(active);
        if (!ensured.ok) {
          showToast({ type: "info", message: ensured.message });
          return;
        }
        setAuthSession(ensured.session);
        await refreshSession();

        const result = await submitSpecialistInquiry(
          draftToSubmitInput(draft, {
            userId: ensured.session.userId,
            firstName:
              ensured.session.firstName?.trim() ||
              active.firstName?.trim() ||
              "Client",
            email: ensured.session.email,
          })
        );

        if (!result.ok) {
          showToast({ type: "info", message: result.message });
          return;
        }

        clearPendingInquiryDraft();
        clearInquiryAutoSendFlag();
        showToast({
          type: "success",
          message: `Message sent to ${draft.specialistName}.`,
        });

        if (searchParams.get("inquiry") === "1") {
          const next = new URLSearchParams(searchParams.toString());
          next.delete("inquiry");
          const qs = next.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname);
        }
      } finally {
        inquiryRunningRef.current = false;
      }
    })();
  }, [isReady, session, pathname, searchParams, router, refreshSession]);

  useEffect(() => {
    if (!isReady) return;
    if (!peekSaveAutoApplyFlag() && searchParams.get("save") !== "1") {
      return;
    }
    if (saveRunningRef.current) return;

    saveRunningRef.current = true;

    void (async () => {
      try {
        let active: AuthSession | null = session;

        if (!active || active.role !== "client") {
          const bootstrapped = await bootstrapInquiryClientFromPendingSignup();
          if (bootstrapped.ok === true) {
            active = bootstrapped.session;
            setAuthSession(active);
          } else if (bootstrapped.ok === false) {
            showToast({ type: "info", message: bootstrapped.message });
            return;
          }
        }

        if (!active || active.role !== "client") {
          return;
        }

        const ensured = await ensureInquiryClientProfileAfterAuth(active);
        if (!ensured.ok) {
          showToast({ type: "info", message: ensured.message });
          return;
        }
        setAuthSession(ensured.session);
        await refreshSession();

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

        if (searchParams.get("save") === "1") {
          const next = new URLSearchParams(searchParams.toString());
          next.delete("save");
          const qs = next.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname);
        }
      } finally {
        saveRunningRef.current = false;
      }
    })();
  }, [isReady, session, pathname, searchParams, router, refreshSession]);

  return null;
}

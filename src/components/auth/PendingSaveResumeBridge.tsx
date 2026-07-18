"use client";

/**
 * After mandatory password setup, apply the pending save-specialist action
 * and open the existing SaveSuccessModal (via save-applied events).
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { COMPLETE_ACCOUNT_PATH } from "@/lib/auth/account-setup";
import {
  clearPendingSaveResume,
  peekPendingSaveResume,
  peekPasswordSetupDoneLocally,
} from "@/lib/auth/pending-save-resume";
import { applyPendingSaveAfterLogin } from "@/lib/specialist-saves";
import { emitSaveApplied } from "@/lib/save-applied-events";
import { peekPendingSaveRecord } from "@/lib/pending-save-storage";
import { JOIN_FLOW_PATH } from "@/lib/join-flow";

export function PendingSaveResumeBridge() {
  const pathname = usePathname();
  const { isReady, session } = useAuthSession();
  const runningRef = useRef(false);
  const sawCreateAccountRef = useRef(false);

  useEffect(() => {
    if (pathname.startsWith(JOIN_FLOW_PATH)) {
      sawCreateAccountRef.current = true;
    }
  }, [pathname]);

  useEffect(() => {
    if (!isReady || !session || session.role !== "client") return;
    if (pathname.startsWith(COMPLETE_ACCOUNT_PATH)) return;
    if (!peekPasswordSetupDoneLocally()) return;

    const resume = peekPendingSaveResume();
    if (!resume || resume.mode === "locked") return;

    if (resume.mode === "after_profile") {
      if (pathname.startsWith(JOIN_FLOW_PATH)) return;
      if (!sawCreateAccountRef.current) return;
    }

    if (runningRef.current) return;
    if (!peekPendingSaveRecord()) {
      clearPendingSaveResume();
      return;
    }

    runningRef.current = true;
    void (async () => {
      try {
        const result = await applyPendingSaveAfterLogin("client");
        clearPendingSaveResume();
        if (result.kind === "client-saved") {
          emitSaveApplied(
            result.record ?? {
              specialistId: result.specialistId,
              actionType: "save_specialist",
              createdAt: new Date().toISOString(),
            }
          );
        }
      } finally {
        runningRef.current = false;
      }
    })();
  }, [isReady, session, pathname]);

  return null;
}

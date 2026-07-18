"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { needsPasswordSetup } from "@/lib/auth/account-setup";
import { flushPendingClientActions } from "@/lib/auth/complete-pending-client-actions";
import {
  peekInquiryAutoSendFlag,
  peekSaveAutoApplyFlag,
} from "@/lib/inquiry/inquiry-session-flags";

/**
 * After magic-link return (post account setup): flush pending inquiry/save.
 * Skips /complete-account and users still pending password setup.
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
    if (pathname.startsWith("/complete-account")) return;
    if (
      session?.passwordSetupStatus &&
      needsPasswordSetup(session.passwordSetupStatus)
    ) {
      return;
    }
    if (!peekInquiryAutoSendFlag() && searchParams.get("inquiry") !== "1") {
      return;
    }
    if (inquiryRunningRef.current) return;
    if (!session) return;

    inquiryRunningRef.current = true;

    void (async () => {
      try {
        const result = await flushPendingClientActions(session, {
          inquiry: true,
        });
        if (result.ok === false) return;

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
    if (pathname.startsWith("/complete-account")) return;
    if (
      session?.passwordSetupStatus &&
      needsPasswordSetup(session.passwordSetupStatus)
    ) {
      return;
    }
    if (!peekSaveAutoApplyFlag() && searchParams.get("save") !== "1") {
      return;
    }
    if (saveRunningRef.current) return;
    if (!session) return;

    saveRunningRef.current = true;

    void (async () => {
      try {
        await flushPendingClientActions(session, { save: true });

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

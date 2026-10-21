"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { isNativeShell } from "@/lib/native-billing";
import {
  allowPushRegistration,
  setPushNavigate,
  stopPushForSignOut,
  syncPushRegistration,
} from "@/lib/push/native-push";

/**
 * iPhone-only. Asks with the system notification dialog, then saves the
 * device token once the person is signed in.
 */
export function NativePushBridge() {
  const router = useRouter();
  const { isReady, isSignedIn } = useAuthSession();

  useEffect(() => {
    setPushNavigate((path) => {
      router.push(path);
    });
  }, [router]);

  useEffect(() => {
    if (!isReady || !isNativeShell()) return;
    if (!isSignedIn) void stopPushForSignOut();

    let cancelled = false;
    void syncPushRegistration().then((status) => {
      if (cancelled || status !== "prompt") return;
      void allowPushRegistration();
    });
    return () => {
      cancelled = true;
    };
  }, [isReady, isSignedIn]);

  return null;
}

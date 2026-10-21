"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativeShell } from "@/lib/native-billing";
import { sharedWorkoutPath, sharedWorkoutTokenFromUrl } from "@/lib/workouts/shared-workout";

/** Custom-scheme taps (smoac://w/…) land on the workout preview. */
export function NativeWorkoutLinkBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeShell()) return;
    let remove: (() => void) | undefined;
    let cancelled = false;

    void import("@capacitor/app")
      .then(({ App }) => {
        if (cancelled) return;
        return App.addListener("appUrlOpen", (event) => {
          const token = sharedWorkoutTokenFromUrl(event.url);
          if (!token) return;
          router.push(sharedWorkoutPath(token));
        });
      })
      .then((handle) => {
        if (!handle) return;
        if (cancelled) {
          void handle.remove();
          return;
        }
        remove = () => {
          void handle.remove();
        };
      })
      .catch(() => {
        /* The iOS project picks the plugin up on the next sync. */
      });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);

  return null;
}

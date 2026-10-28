"use client";

import { useEffect } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { subscribeIosApp } from "@/lib/health/apple-health";
import { getClientWorkoutLog } from "@/lib/workouts/client-workout-store";
import { syncWorkoutLiveActivity, adoptLockScreenClock, subscribeLockScreenClock } from "@/lib/workouts/workout-live-activity";

/**
 * Keeps the lock screen in step with an in-progress workout from any page.
 * One listener only. Every workout screen calling this was starting a pile of
 * cards, and iOS then dropped the one on the lock screen.
 */
export function NativeWorkoutLiveBridge() {
  const { isReady, session } = useAuthSession();
  if (!isReady) return null;
  const userId = session?.role === "client" ? session.userId : null;
  return <WorkoutLiveSync userId={userId} />;
}

function WorkoutLiveSync({ userId }: { userId: string | null }) {
  const { log } = useClientWorkouts(userId);

  useEffect(() => {
    void syncWorkoutLiveActivity(log);
  }, [log]);

  useEffect(() => {
    let stopListening = () => {};
    let cancelled = false;
    const catchUp = () => {
      if (document.visibilityState === "hidden") return;
      void adoptLockScreenClock(userId).finally(() => {
        void syncWorkoutLiveActivity(getClientWorkoutLog(userId), { force: true });
      });
    };
    void subscribeLockScreenClock(() => {
      void adoptLockScreenClock(userId);
    }).then((unsubscribe) => {
      if (cancelled) unsubscribe();
      else stopListening = unsubscribe;
    });
    catchUp();
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("pageshow", catchUp);
    const stopWatchingShell = subscribeIosApp(() => {
      void adoptLockScreenClock(userId).finally(() => {
        void syncWorkoutLiveActivity(getClientWorkoutLog(userId));
      });
    });
    return () => {
      cancelled = true;
      stopListening();
      stopWatchingShell();
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("pageshow", catchUp);
    };
  }, [userId]);

  return null;
}

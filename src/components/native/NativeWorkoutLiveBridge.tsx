"use client";

import { useEffect } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { subscribeIosApp } from "@/lib/health/apple-health";
import { getClientWorkoutLog } from "@/lib/workouts/client-workout-store";
import { syncWorkoutLiveActivity } from "@/lib/workouts/workout-live-activity";

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
    const reopen = () => {
      if (document.visibilityState === "hidden") return;
      void syncWorkoutLiveActivity(getClientWorkoutLog(userId), { force: true });
    };
    document.addEventListener("visibilitychange", reopen);
    window.addEventListener("pageshow", reopen);
    const stopWatchingShell = subscribeIosApp(() => {
      void syncWorkoutLiveActivity(getClientWorkoutLog(userId));
    });
    return () => {
      stopWatchingShell();
      document.removeEventListener("visibilitychange", reopen);
      window.removeEventListener("pageshow", reopen);
    };
  }, [userId]);

  return null;
}

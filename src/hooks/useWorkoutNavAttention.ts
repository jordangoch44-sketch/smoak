"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useClientCoaching } from "@/hooks/useClientCoaching";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { pendingCoachWorkoutNotices } from "@/lib/coaching/coach-workout";
import { refreshCoaching } from "@/lib/coaching/coaching-store";
import {
  acknowledgeWorkoutNav,
  getWorkoutNavSeenServerSnapshot,
  getWorkoutNavSeenSnapshot,
  subscribeWorkoutNavSeen,
} from "@/lib/coaching/workout-nav-seen";
import { getUserRole } from "@/lib/specialist-saves";

const POLL_MS = 60_000;

/**
 * Red count on the Workouts icon. Matches the dashboard notice: a workout a
 * coach sent and the client has not opened yet. Opening Workouts clears it.
 */
export function useWorkoutNavAttention(viewingWorkouts: boolean): number {
  const { session } = useAuthSession();
  const userId = getUserRole(session) === "client" ? (session?.userId ?? null) : null;
  const coaching = useClientCoaching(userId);
  const { log } = useClientWorkouts(userId);
  const seen = useSyncExternalStore(
    subscribeWorkoutNavSeen,
    () => getWorkoutNavSeenSnapshot(userId),
    getWorkoutNavSeenServerSnapshot
  );

  useEffect(() => {
    if (!userId) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshCoaching("client", userId);
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [userId]);

  const unseenIds = useMemo(() => {
    if (!userId || !coaching.loaded) return [];
    const seenIds = new Set(seen);
    return pendingCoachWorkoutNotices(coaching.workouts, log.days)
      .map((workout) => workout.id)
      .filter((id) => !seenIds.has(id));
  }, [userId, coaching.loaded, coaching.workouts, log.days, seen]);

  const unseenKey = unseenIds.join(",");

  useEffect(() => {
    if (!viewingWorkouts || !userId || !coaching.loaded || unseenIds.length === 0) return;
    acknowledgeWorkoutNav(userId, unseenIds);
  }, [viewingWorkouts, userId, coaching.loaded, unseenIds, unseenKey]);

  return viewingWorkouts ? 0 : unseenIds.length;
}

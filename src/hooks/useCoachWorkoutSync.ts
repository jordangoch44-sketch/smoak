"use client";

import { useEffect, useRef } from "react";
import { useClientCoaching } from "@/hooks/useClientCoaching";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { coachProgressFromLog, coachProgressSignature } from "@/lib/coaching/coach-workout";

/** Wait for typing / checking-off to settle before sharing progress. */
const SYNC_DELAY_MS = 1200;

/**
 * Shares progress on coach workouts back to the specialist: started once the
 * exercises are in the client's log, completed when every one is checked off,
 * plus the sets logged for those exercises only.
 */
export function useCoachWorkoutSync(userId: string | null) {
  const { log } = useClientWorkouts(userId);
  const { workouts, reportProgress } = useClientCoaching(userId);
  /** Last signature sent per workout, so a failed or echoing save can't loop. */
  const sentRef = useRef(new Map<string, string>());

  useEffect(() => {
    if (!userId || workouts.length === 0) return;
    const timer = window.setTimeout(() => {
      for (const workout of workouts) {
        const progress = coachProgressFromLog(workout, log.days);
        if (!progress) continue;
        const next = coachProgressSignature(progress.status, progress.clientLog);
        if (next === coachProgressSignature(workout.status, workout.clientLog)) continue;
        if (sentRef.current.get(workout.id) === next) continue;
        sentRef.current.set(workout.id, next);
        void reportProgress(workout.id, progress.status, progress.clientLog);
      }
    }, SYNC_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [userId, log.days, workouts, reportProgress]);
}

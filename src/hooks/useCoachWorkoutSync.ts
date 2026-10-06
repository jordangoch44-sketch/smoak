"use client";

import { useEffect, useRef } from "react";
import { useClientCoaching } from "@/hooks/useClientCoaching";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { coachProgressFromLog, coachProgressSignature } from "@/lib/coaching/coach-workout";

/** Wait for typing / checking-off to settle before sharing progress. */
const SYNC_DELAY_MS = 1200;

/**
 * Shares in-progress sets on coach workouts back to the specialist.
 * Finish workout is what marks a workout completed, so a fully checked log
 * stays "started" until the client presses that button.
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
        if (workout.status === "completed") continue;
        const progress = coachProgressFromLog(workout, log.days);
        if (!progress || progress.status === "completed") continue;
        const next = coachProgressSignature("started", progress.clientLog);
        if (next === coachProgressSignature(workout.status, workout.clientLog)) continue;
        if (sentRef.current.get(workout.id) === next) continue;
        sentRef.current.set(workout.id, next);
        void reportProgress(workout.id, "started", progress.clientLog);
      }
    }, SYNC_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [userId, log.days, workouts, reportProgress]);
}

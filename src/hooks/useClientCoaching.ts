"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import {
  endCoaching,
  requestAcceptCoaching,
  respondRosterInvite,
  updateCoachWorkoutProgress,
} from "@/lib/coaching/coaching-service";
import {
  EMPTY_COACHING,
  getCoachingSnapshot,
  patchCoaching,
  refreshCoaching,
  subscribeCoaching,
  upsertById,
} from "@/lib/coaching/coaching-store";
import type { ClientWorkoutExercise } from "@/types/client-workout";
import type { CoachWorkout, CoachWorkoutStatus } from "@/types/coaching";

/** Client view: roster invites, active coaches, and workouts coaches sent. */
export function useClientCoaching(userId: string | null) {
  const snapshot = useSyncExternalStore(
    subscribeCoaching,
    () => getCoachingSnapshot("client", userId),
    () => EMPTY_COACHING
  );

  useEffect(() => {
    if (!userId) return;
    const refresh = () => void refreshCoaching("client", userId);
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  const respond = useCallback(
    async (relationshipId: string, accept: boolean) => {
      const supabase = getMarketplaceAuthClient();
      if (!userId || !supabase) return false;
      const result = accept
        ? await requestAcceptCoaching({ relationshipId })
        : await respondRosterInvite(supabase, relationshipId, false);
      if (!result.ok) return false;
      patchCoaching("client", userId, (current) => ({
        ...current,
        relationships:
          result.data.status === "active"
            ? upsertById(current.relationships, result.data)
            : current.relationships.filter((item) => item.id !== relationshipId),
      }));
      return true;
    },
    [userId]
  );

  const leave = useCallback(
    async (relationshipId: string) => {
      const supabase = getMarketplaceAuthClient();
      if (!userId || !supabase) return false;
      const result = await endCoaching(supabase, relationshipId);
      if (!result.ok) return false;
      patchCoaching("client", userId, (current) => ({
        ...current,
        relationships: current.relationships.filter((item) => item.id !== relationshipId),
      }));
      return true;
    },
    [userId]
  );

  const reportProgress = useCallback(
    async (
      workoutId: string,
      status: Exclude<CoachWorkoutStatus, "sent">,
      clientLog: ClientWorkoutExercise[]
    ) => {
      const supabase = getMarketplaceAuthClient();
      if (!userId || !supabase) return false;
      const result = await updateCoachWorkoutProgress(supabase, workoutId, status, clientLog);
      if (!result.ok) return false;
      patchCoaching("client", userId, (current) => ({
        ...current,
        workouts: upsertById(current.workouts, result.data),
      }));
      return true;
    },
    [userId]
  );

  return useMemo(() => {
    const invites = snapshot.relationships.filter((item) => item.status === "invited");
    const coaches = snapshot.relationships.filter((item) => item.status === "active");
    const coachNames = new Map(coaches.map((item) => [item.id, item.specialistName]));
    const workoutsByDate = new Map<string, CoachWorkout[]>();
    for (const workout of snapshot.workouts) {
      const list = workoutsByDate.get(workout.dateKey) ?? [];
      list.push(workout);
      workoutsByDate.set(workout.dateKey, list);
    }
    return {
      loaded: snapshot.loaded,
      invites,
      coaches,
      workouts: snapshot.workouts,
      workoutsByDate,
      coachNameFor: (workout: CoachWorkout) => coachNames.get(workout.relationshipId) ?? "",
      respond,
      leave,
      reportProgress,
    };
  }, [snapshot, respond, leave, reportProgress]);
}

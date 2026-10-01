"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { getMarketplaceAuthClient } from "@/lib/auth/marketplace-auth";
import {
  createCoachingInviteLink,
  deleteCoachWorkout,
  endCoaching,
  requestRosterInvite,
  requestSendCoachWorkout,
  type CoachingResult,
  type SendCoachWorkoutInput,
} from "@/lib/coaching/coaching-service";
import {
  EMPTY_COACHING,
  getCoachingSnapshot,
  patchCoaching,
  refreshCoaching,
  subscribeCoaching,
  upsertById,
} from "@/lib/coaching/coaching-store";
import type { CoachingRelationship, CoachWorkout } from "@/types/coaching";

/** Specialist view: roster and sent workouts for their marketplace id. */
export function useCoachingRoster(specialistId: string | null) {
  const snapshot = useSyncExternalStore(
    subscribeCoaching,
    () => getCoachingSnapshot("specialist", specialistId),
    () => EMPTY_COACHING
  );

  useEffect(() => {
    if (!specialistId) return;
    const refresh = () => void refreshCoaching("specialist", specialistId);
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
  }, [specialistId]);

  const invite = useCallback(
    async (conversationId: string): Promise<CoachingResult<CoachingRelationship>> => {
      const result = await requestRosterInvite(conversationId);
      if (result.ok && specialistId) {
        patchCoaching("specialist", specialistId, (current) => ({
          ...current,
          relationships: upsertById(current.relationships, result.data),
        }));
      }
      return result;
    },
    [specialistId]
  );

  const sendWorkout = useCallback(
    async (input: SendCoachWorkoutInput): Promise<CoachingResult<CoachWorkout>> => {
      const result = await requestSendCoachWorkout(input);
      if (result.ok && specialistId) {
        patchCoaching("specialist", specialistId, (current) => ({
          ...current,
          workouts: upsertById(current.workouts, result.data),
        }));
      }
      return result;
    },
    [specialistId]
  );

  const removeWorkout = useCallback(
    async (workoutId: string) => {
      const supabase = getMarketplaceAuthClient();
      if (!specialistId || !supabase) return false;
      const result = await deleteCoachWorkout(supabase, workoutId);
      if (!result.ok) return false;
      patchCoaching("specialist", specialistId, (current) => ({
        ...current,
        workouts: current.workouts.filter((item) => item.id !== workoutId),
      }));
      return true;
    },
    [specialistId]
  );

  const createInviteLink = useCallback(
    async (
      specialistName: string,
      clientFirstName: string
    ): Promise<CoachingResult<{ token: string }>> => {
      const supabase = getMarketplaceAuthClient();
      if (!specialistId || !supabase) {
        return { ok: false, message: "Sign in again to create a link." };
      }
      return createCoachingInviteLink(supabase, { specialistId, specialistName, clientFirstName });
    },
    [specialistId]
  );

  const removeClient = useCallback(
    async (relationshipId: string) => {
      const supabase = getMarketplaceAuthClient();
      if (!specialistId || !supabase) return false;
      const result = await endCoaching(supabase, relationshipId);
      if (!result.ok) return false;
      patchCoaching("specialist", specialistId, (current) => ({
        ...current,
        relationships: current.relationships.filter((item) => item.id !== relationshipId),
      }));
      return true;
    },
    [specialistId]
  );

  return useMemo(
    () => ({
      loaded: snapshot.loaded,
      roster: snapshot.relationships,
      workouts: snapshot.workouts,
      relationshipForConversation: (conversationId: string) =>
        snapshot.relationships.find((item) => item.conversationId === conversationId) ?? null,
      workoutsFor: (relationshipId: string) =>
        snapshot.workouts.filter((item) => item.relationshipId === relationshipId),
      invite,
      createInviteLink,
      sendWorkout,
      removeWorkout,
      removeClient,
    }),
    [snapshot, invite, createInviteLink, sendWorkout, removeWorkout, removeClient]
  );
}

"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useCoachingRoster } from "@/hooks/useCoachingRoster";
import {
  acknowledgeClientNav,
  clientNavAttention,
  EMPTY_CLIENT_NAV_ATTENTION,
  getClientNavSeenServerSnapshot,
  getClientNavSeenSnapshot,
  subscribeClientNavSeen,
} from "@/lib/coaching/client-nav-attention";
import { refreshCoaching } from "@/lib/coaching/coaching-store";
import { readLocalFinishedSeen } from "@/lib/coaching/coach-workout";
import { resolveManagedSpecialistId } from "@/lib/managed-specialist-profile";
import { subscribeSpecialistApplications } from "@/lib/specialist-application-storage";
import { getUserRole } from "@/lib/specialist-saves";

const POLL_MS = 60_000;
const noopSubscribe = () => () => {};

/**
 * Red dot on the Clients tab. True when a client joined or finished a sent
 * workout and the specialist is not already looking at Clients.
 */
export function useClientNavAttention(viewingClients: boolean): boolean {
  const { session } = useAuthSession();
  const isSpecialist = getUserRole(session) === "specialist";
  const email = session?.email;
  const userId = session?.userId;

  const specialistId = useSyncExternalStore(
    isSpecialist ? subscribeSpecialistApplications : noopSubscribe,
    () => (isSpecialist ? resolveManagedSpecialistId(email, userId) : null),
    () => null
  );

  const roster = useCoachingRoster(specialistId);
  const seen = useSyncExternalStore(
    subscribeClientNavSeen,
    () => getClientNavSeenSnapshot(specialistId),
    getClientNavSeenServerSnapshot
  );
  const [finishedRevision, setFinishedRevision] = useState(0);

  useEffect(() => {
    if (!specialistId) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshCoaching("specialist", specialistId);
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [specialistId]);

  useEffect(() => {
    const bump = () => setFinishedRevision((current) => current + 1);
    window.addEventListener("smoac:coach-finished-seen", bump);
    return () => window.removeEventListener("smoac:coach-finished-seen", bump);
  }, []);

  const attention = useMemo(() => {
    if (!specialistId || !roster.loaded) return EMPTY_CLIENT_NAV_ATTENTION;
    return clientNavAttention({
      relationships: roster.roster,
      workouts: roster.workouts,
      seen,
      dismissedWorkoutIds: readLocalFinishedSeen(),
    });
  }, [specialistId, roster.loaded, roster.roster, roster.workouts, seen, finishedRevision]);

  const attentionKey = `${attention.relationshipIds.join(",")}|${attention.workoutIds.join(",")}`;

  useEffect(() => {
    if (!viewingClients || !specialistId || !roster.loaded || !attention.show) return;
    acknowledgeClientNav(specialistId, roster.roster, roster.workouts);
  }, [
    viewingClients,
    specialistId,
    roster.loaded,
    roster.roster,
    roster.workouts,
    attention.show,
    attentionKey,
  ]);

  return attention.show && !viewingClients;
}

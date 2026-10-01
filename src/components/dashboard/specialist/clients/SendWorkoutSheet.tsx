"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ClientWorkoutDaySheet } from "@/components/dashboard/client/workouts/ClientWorkoutDaySheet";
import { MiniDayCalendar } from "@/components/dashboard/client/workouts/MiniDayCalendar";
import { useToast } from "@/components/ui/toast";
import { coachWorkoutHistoryExercises } from "@/lib/coaching/coach-workout";
import type { CoachingResult, SendCoachWorkoutInput } from "@/lib/coaching/coaching-service";
import { lockOverlayDocumentScroll } from "@/lib/lock-overlay-scroll";
import { exerciseMemoryBefore, toLocalDateKey } from "@/lib/workouts/client-workout";
import type { ClientWorkoutDay } from "@/types/client-workout";
import type { CoachingRelationship, CoachWorkout } from "@/types/coaching";
import "@/styles/client-workouts.css";

const LOCK_CLASS = "client-workouts-open";

/** The client workout editor, ending in "Send to …" instead of logging. */
export function SendWorkoutSheet({
  relationship,
  workouts = [],
  onSend,
  onClose,
}: {
  relationship: CoachingRelationship;
  /** Workouts already sent to this client, used to refill sets and weights. */
  workouts?: readonly CoachWorkout[];
  onSend: (input: SendCoachWorkoutInput) => Promise<CoachingResult<CoachWorkout>>;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [todayKey] = useState(() => toLocalDateKey(new Date()));
  const [dateKey, setDateKey] = useState(todayKey);
  const [draft, setDraft] = useState<ClientWorkoutDay | undefined>(undefined);
  const name = relationship.clientFirstName.trim() || "your client";
  const priorSets = useMemo(
    () =>
      exerciseMemoryBefore(
        workouts.map((workout) => ({
          dateKey: workout.dateKey,
          exercises: coachWorkoutHistoryExercises(workout),
        })),
        dateKey
      ),
    [workouts, dateKey]
  );

  useEffect(() => {
    document.body.classList.add(LOCK_CLASS);
    document.documentElement.classList.add(LOCK_CLASS);
    const unlock = lockOverlayDocumentScroll();
    return () => {
      unlock();
      document.body.classList.remove(LOCK_CLASS);
      document.documentElement.classList.remove(LOCK_CLASS);
    };
  }, []);

  async function send(exercises: ClientWorkoutDay["exercises"], title: string) {
    const result = await onSend({
      relationshipId: relationship.id,
      dateKey,
      title: title || "Workout",
      note: "",
      exercises,
    });
    if (!result.ok) return result.message;
    showToast({ type: "success", message: `Workout sent to ${name}.` });
    return null;
  }

  const dateControl = (
    <MiniDayCalendar
      value={dateKey}
      todayKey={todayKey}
      min={todayKey}
      onChange={setDateKey}
      triggerClassName="roster-send__pill roster-send__pill--day"
    />
  );

  return createPortal(
    <div className="client-workouts-root" role="presentation">
      <div className="client-workouts-root__backdrop" aria-hidden />
      <ClientWorkoutDaySheet
        dateKey={dateKey}
        workout={draft}
        weekLabel=""
        onClose={onClose}
        onSave={(exercises, title, cardio) => {
          setDraft({ date: dateKey, title, exercises, cardio });
          return true;
        }}
        onRemove={() => setDraft(undefined)}
        onCopy={() => {}}
        priorSets={priorSets}
        send={{ clientName: name, dateControl, onSend: send }}
      />
    </div>,
    document.body
  );
}

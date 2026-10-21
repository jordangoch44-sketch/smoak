"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ClientWorkoutDaySheet } from "@/components/dashboard/client/workouts/ClientWorkoutDaySheet";
import { MiniDayCalendar } from "@/components/dashboard/client/workouts/MiniDayCalendar";
import { useToast } from "@/components/ui/toast";
import { coachWorkoutHistoryExercises } from "@/lib/coaching/coach-workout";
import type {
  CoachingResult,
  SendCoachWorkoutInput,
  UpdateCoachWorkoutInput,
} from "@/lib/coaching/coaching-service";
import { lockOverlayDocumentScroll } from "@/lib/lock-overlay-scroll";
import { exerciseMemoryBefore, toLocalDateKey } from "@/lib/workouts/client-workout";
import type { ClientWorkoutDay } from "@/types/client-workout";
import type { CoachingRelationship, CoachWorkout } from "@/types/coaching";
import "@/styles/client-workouts.css";

const LOCK_CLASS = "client-workouts-open";

/** The client workout editor. A new workout is sent; an upcoming one is saved in place. */
export function SendWorkoutSheet({
  relationship,
  workouts = [],
  editing = null,
  onSend,
  onUpdate,
  onClose,
}: {
  relationship: CoachingRelationship;
  /** Workouts already sent to this client, used to refill sets and weights. */
  workouts?: readonly CoachWorkout[];
  /** An upcoming workout the client has not started. */
  editing?: CoachWorkout | null;
  onSend?: (input: SendCoachWorkoutInput) => Promise<CoachingResult<CoachWorkout>>;
  onUpdate?: (input: UpdateCoachWorkoutInput) => Promise<CoachingResult<CoachWorkout>>;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [todayKey] = useState(() => toLocalDateKey(new Date()));
  const [dateKey, setDateKey] = useState(editing?.dateKey ?? todayKey);
  const [draft, setDraft] = useState<ClientWorkoutDay | undefined>(() =>
    editing
      ? {
          date: editing.dateKey,
          title: editing.title,
          exercises: editing.exercises.map((exercise) => ({ ...exercise })),
        }
      : undefined
  );
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
    if (editing) {
      if (!onUpdate) return "Could not save the workout.";
      const result = await onUpdate({
        workoutId: editing.id,
        dateKey,
        title: title || "Workout",
        note: editing.note,
        exercises,
      });
      if (!result.ok) return result.message;
      showToast({ type: "success", message: "Workout updated" });
      return null;
    }
    if (!onSend) return "Could not send the workout.";
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
        onClose={onClose}
        onSave={(exercises, title, cardio) => {
          setDraft({ date: dateKey, title, exercises, cardio });
          return true;
        }}
        onRemove={() => setDraft(undefined)}
        onCopy={() => {}}
        priorSets={priorSets}
        send={{
          clientName: name,
          dateControl,
          action: editing ? "save" : "send",
          onSend: send,
        }}
      />
    </div>,
    document.body
  );
}

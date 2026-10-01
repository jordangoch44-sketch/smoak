"use client";

import { useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CloseIcon } from "@/components/ui/icons";
import { COACH_WORKOUT_STATUS_LABEL } from "@/lib/coaching/coach-workout";
import {
  formatExerciseRange,
  formatWorkoutDayHeading,
  toLocalDateKey,
} from "@/lib/workouts/client-workout";
import { cn } from "@/lib/utils";
import type { CoachingRelationship, CoachWorkout } from "@/types/coaching";
import { RosterSheet } from "./RosterSheet";

/** Workouts sent to one client: upcoming first, then history with what they logged. */
export function ClientPlanSheet({
  relationship,
  workouts,
  onSendWorkout,
  onRemoveWorkout,
  onRemoveClient,
  onClose,
}: {
  relationship: CoachingRelationship;
  workouts: readonly CoachWorkout[];
  onSendWorkout: () => void;
  onRemoveWorkout: (workoutId: string) => Promise<boolean>;
  onRemoveClient: () => void;
  onClose: () => void;
}) {
  const [todayKey] = useState(() => toLocalDateKey(new Date()));
  const [error, setError] = useState<string | null>(null);
  const name = relationship.clientFirstName.trim() || "Client";

  const sorted = [...workouts].sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  const upcoming = sorted.filter((item) => item.dateKey >= todayKey && item.status !== "completed");
  const past = sorted.filter((item) => !upcoming.includes(item)).reverse();

  async function remove(workout: CoachWorkout) {
    setError(null);
    const ok = await onRemoveWorkout(workout.id);
    if (!ok) setError("Only workouts they haven’t started can be removed.");
  }

  function renderWorkout(workout: CoachWorkout) {
    const logged = workout.clientLog?.length ?? 0;
    return (
      <li key={workout.id} className="roster-plan__item">
        <div className="roster-plan__item-top">
          <span className="roster-plan__date">{formatWorkoutDayHeading(workout.dateKey)}</span>
          <span className={cn("roster-plan__status", `roster-plan__status--${workout.status}`)}>
            {COACH_WORKOUT_STATUS_LABEL[workout.status]}
          </span>
          {workout.status === "sent" ? (
            <FastActivateButton
              className="roster-plan__remove"
              aria-label={`Remove ${workout.title || "workout"}`}
              onActivate={() => void remove(workout)}
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </FastActivateButton>
          ) : null}
        </div>
        <p className="roster-plan__title">{workout.title || "Workout"}</p>
        <ul className="roster-plan__exercises">
          {workout.exercises.map((exercise) => {
            const log = workout.clientLog?.find((entry) => entry.id === exercise.id);
            const sets = (log?.setLogs ?? []).filter((set) => set.weight || set.reps);
            return (
              <li key={exercise.id}>
                <span>{exercise.name}</span>
                <span className="roster-plan__scheme">
                  {sets.length > 0
                    ? sets
                        .map((set) => (set.weight ? `${set.weight}×${set.reps || "–"}` : set.reps))
                        .join(", ")
                    : formatExerciseRange(exercise)}
                </span>
              </li>
            );
          })}
        </ul>
        {logged > 0 && workout.status !== "completed" ? (
          <p className="roster-plan__hint">
            {logged} of {workout.exercises.length} exercises logged
          </p>
        ) : null}
      </li>
    );
  }

  return (
    <RosterSheet title={name} subtitle="Workouts you’ve sent" onClose={onClose}>
      {sorted.length === 0 ? (
        <p className="roster-sheet__empty">No workouts sent yet.</p>
      ) : (
        <div className="roster-plan">
          {upcoming.length > 0 ? (
            <section>
              <p className="roster-plan__heading">Upcoming</p>
              <ul className="roster-plan__list">{upcoming.map(renderWorkout)}</ul>
            </section>
          ) : null}
          {past.length > 0 ? (
            <section>
              <p className="roster-plan__heading">History</p>
              <ul className="roster-plan__list">{past.map(renderWorkout)}</ul>
            </section>
          ) : null}
        </div>
      )}
      {error ? <p className="client-workouts-error">{error}</p> : null}
      {relationship.status === "active" ? (
        <FastActivateButton
          className="client-workouts-btn client-workouts-btn--primary"
          onActivate={onSendWorkout}
        >
          Send a workout
        </FastActivateButton>
      ) : null}
      <FastActivateButton className="roster-plan__end" onActivate={onRemoveClient}>
        {relationship.status === "invited" ? "Cancel invite" : "Remove from roster"}
      </FastActivateButton>
    </RosterSheet>
  );
}

"use client";

import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { COACH_WORKOUT_STATUS_LABEL, formatCoachName } from "@/lib/coaching/coach-workout";
import { formatExerciseRange, formatWorkoutDayHeading } from "@/lib/workouts/client-workout";
import { cn } from "@/lib/utils";
import type { CoachWorkout } from "@/types/coaching";
import "@/styles/coaching.css";

/** A workout a coach sent, shown on its day. Start copies it into today's log. */
export function CoachWorkoutCard({
  workout,
  coachName,
  todayKey,
  inLog,
  onStart,
}: {
  workout: CoachWorkout;
  coachName: string;
  todayKey: string;
  /** Already copied into the client's log (started or done). */
  inLog: boolean;
  onStart: () => void;
}) {
  const named = Boolean(coachName.trim());
  const coach = named ? formatCoachName(coachName) : "Your coach";
  const plannedFor =
    workout.dateKey === todayKey ? "Today" : formatWorkoutDayHeading(workout.dateKey);

  return (
    <section className="coach-workout" aria-label={`Workout from ${coach}`}>
      <div className="coach-workout__top">
        <p className="coaching-card__eyebrow">{named ? `From coach ${coach}` : "From your coach"}</p>
        {inLog ? (
          <span className={cn("coach-workout__status", `coach-workout__status--${workout.status}`)}>
            {COACH_WORKOUT_STATUS_LABEL[workout.status]}
          </span>
        ) : null}
      </div>
      <p className="coach-workout__title">
        {workout.title || "Workout"}
        <span className="coach-workout__date"> · {plannedFor}</span>
      </p>
      {workout.note ? <p className="coach-workout__note">“{workout.note}”</p> : null}
      <ul className="coach-workout__list">
        {workout.exercises.map((exercise) => (
          <li key={exercise.id}>
            <span>{exercise.name}</span>
            <span className="coach-workout__scheme">
              {formatExerciseRange(exercise)}
            </span>
          </li>
        ))}
      </ul>
      {inLog ? (
        <p className="coach-workout__hint">
          In your log. {coach} sees your sets as you check them off.
        </p>
      ) : (
        <>
          <FastActivateButton className="coaching-btn coaching-btn--primary" onActivate={onStart}>
            {workout.dateKey === todayKey ? "Start workout" : "Start today"}
          </FastActivateButton>
          <p className="coach-workout__hint">
            Adds it to today’s log. {coach} sees the sets you log for it.
          </p>
        </>
      )}
    </section>
  );
}

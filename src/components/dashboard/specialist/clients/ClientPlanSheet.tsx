"use client";

import { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/ui/Logo";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  CalendarIcon,
  ChartIcon,
  ChevronRightIcon,
  CloseIcon,
  DumbbellIcon,
  UserIcon,
} from "@/components/ui/icons";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { formatSetCount, formatWorkoutDayHeading, toLocalDateKey } from "@/lib/workouts/client-workout";
import { cn } from "@/lib/utils";
import type { ClientWorkoutExercise } from "@/types/client-workout";
import type { CoachingRelationship, CoachWorkout } from "@/types/coaching";
import { RosterSheet } from "./RosterSheet";

/** Matches the summary card: about five minutes of work and rest per set. */
const MINUTES_PER_SET = 5;

type SummarySet = { label: string; detail: string };

type SummaryRow = {
  id: string;
  name: string;
  setCount: number;
  setLabel: string | null;
  cue: string | null;
  pill: string | null;
  sets: SummarySet[] | null;
};

function repsPhrase(reps: string): string {
  const value = reps.trim();
  if (!value) return "";
  if (/rep/i.test(value)) return value;
  const range = value.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (range) return `${range[1]}–${range[2]} reps`;
  if (/^\d+$/.test(value)) return `${value} reps`;
  return value;
}

function weightPhrase(weight: string): string {
  const value = weight.trim();
  if (!value) return "";
  if (/[a-z]/i.test(value)) return value;
  return `${value} lb`;
}

function setDetail(reps: string, weight: string): string {
  return [repsPhrase(reps), weightPhrase(weight)].filter(Boolean).join(" · ");
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** "8 each leg" is a cue for the reps line, not a separate instruction. */
function sideCue(note: string): string | null {
  const match = note
    .trim()
    .match(/^(?:\d+\s+)?(each\s+leg|each\s+side|each\s+arm|per\s+leg|per\s+side|per\s+arm)$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function setCountOf(exercise: ClientWorkoutExercise): number {
  if (exercise.setLogs && exercise.setLogs.length > 0) return exercise.setLogs.length;
  if (/^\d+$/.test(exercise.sets.trim())) return Number(exercise.sets.trim());
  return 0;
}

function loggedExercise(workout: CoachWorkout, exercise: ClientWorkoutExercise) {
  const log = workout.clientLog?.find((entry) => entry.id === exercise.id);
  const filled = (log?.setLogs ?? []).some((set) => set.reps.trim() || set.weight.trim());
  return filled ? log : undefined;
}

function repsLine(reps: string, weight: string, cue: string | null): string {
  const repsText = repsPhrase(reps);
  const withCue = cue && repsText ? `${repsText} (${cue})` : repsText;
  const weightText = weightPhrase(weight);
  return [withCue, weightText].filter(Boolean).join(" · ");
}

function summaryRow(exercise: ClientWorkoutExercise, source: ClientWorkoutExercise): SummaryRow {
  const note = (exercise.note ?? "").trim();
  const cue = sideCue(note);
  const setCount = setCountOf(source) || setCountOf(exercise);
  const logs = (source.setLogs ?? []).map((log, index) => ({
    index,
    reps: log.reps.trim(),
    weight: log.weight.trim(),
  }));
  const filled = logs.filter((log) => log.reps || log.weight);
  const first = filled[0];
  const uniform =
    first != null &&
    filled.length === logs.length &&
    filled.every((log) => log.reps === first.reps && log.weight === first.weight);

  let pill: string | null = null;
  let sets: SummarySet[] | null = null;
  if (filled.length > 0 && !uniform) {
    sets = filled.map((log) => ({
      label: `Set ${log.index + 1}`,
      detail: setDetail(log.reps, log.weight),
    }));
  } else if (first) {
    pill = repsLine(first.reps, first.weight, cue);
  } else if (source.reps.trim() || exercise.reps.trim()) {
    pill = repsLine(source.reps.trim() || exercise.reps.trim(), "", cue);
  }

  return {
    id: exercise.id,
    name: titleCase(exercise.name.trim() || "Exercise"),
    setCount,
    setLabel: setCount > 0 ? formatSetCount(setCount) : null,
    cue: cue ? null : note ? titleCase(note) : null,
    pill,
    sets,
  };
}

function focusLabel(workout: CoachWorkout): string {
  const title = workout.title.trim();
  if (/lower|\blegs?\b/i.test(title)) return "Lower Body";
  if (/upper|push|pull|\bchest\b|\bback\b|\barms?\b/i.test(title)) return "Upper Body";
  if (/full/i.test(title)) return "Full Body";
  if (/core|\babs?\b/i.test(title)) return "Core";

  let lower = 0;
  let upper = 0;
  let core = 0;
  for (const exercise of workout.exercises) {
    const blob = [exercise.name, exercise.muscle, ...(exercise.otherMuscles ?? [])]
      .filter(Boolean)
      .join(" ");
    if (/quad|hamstring|glute|calf|\bleg\b|hip|lunge|squat|deadlift|step-up/i.test(blob)) lower += 1;
    else if (/chest|back|shoulder|delt|bicep|tricep|\blat\b|pec|\barm\b/i.test(blob)) upper += 1;
    else if (/core|abdomin|oblique/i.test(blob)) core += 1;
  }
  const kinds = [lower > 0, upper > 0, core > 0].filter(Boolean).length;
  if (kinds > 1) return "Full Body";
  if (lower) return "Lower Body";
  if (upper) return "Upper Body";
  if (core) return "Core";
  return title ? titleCase(title) : "Workout";
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <circle cx="12" cy="12" r="8.25" />
      <path strokeLinecap="round" d="M12 7.5V12l3 2" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5 4.5 8.25 12 12l7.5-3.75L12 4.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12 12 15.75 19.5 12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75 12 19.5l7.5-3.75" />
    </svg>
  );
}

function SentWorkoutSummary({
  workout,
  onClose,
}: {
  workout: CoachWorkout;
  onClose: () => void;
}) {
  const titleId = useId();
  const backdropDismiss = useOwnPointerDismiss(onClose);
  const rows = workout.exercises.map((exercise) =>
    summaryRow(exercise, loggedExercise(workout, exercise) ?? exercise)
  );
  const totalSets = rows.reduce((sum, row) => sum + row.setCount, 0);
  const minutes = totalSets > 0 ? totalSets * MINUTES_PER_SET : null;
  const when = formatWorkoutDayHeading(workout.dateKey);
  const note = workout.note.trim();
  const focus = focusLabel(workout);

  return createPortal(
    <div className="roster-summary" role="presentation">
      <button
        type="button"
        className="roster-summary__backdrop"
        aria-label="Close workout summary"
        onPointerDown={backdropDismiss.onPointerDown}
        onPointerUp={backdropDismiss.onPointerUp}
        onClick={backdropDismiss.onClick}
      />
      <div className="roster-summary__card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="roster-summary__brand">
          <Logo href={null} size="sm" />
          <div className="roster-summary__brand-actions">
            <span className="roster-summary__view">
              <span className="roster-summary__view-avatar">
                <UserIcon className="h-3.5 w-3.5" />
              </span>
              Client View
              <span className="roster-summary__view-dot" aria-hidden />
            </span>
            <FastActivateButton className="roster-summary__close" aria-label="Close" onActivate={onClose}>
              <CloseIcon className="h-3.5 w-3.5" />
            </FastActivateButton>
          </div>
        </div>
        <div className="roster-summary__headline">
          <h2 id={titleId} className="roster-summary__title">
            Workout Summary
          </h2>
          {minutes != null ? (
            <span className="roster-summary__time">
              <ClockIcon className="h-3.5 w-3.5" />~{minutes} min
            </span>
          ) : null}
        </div>
        <p className="roster-summary__date">
          <CalendarIcon className="h-3.5 w-3.5" />
          {when}
        </p>
        {note ? <p className="roster-summary__workout-note">{note}</p> : null}
        {rows.length === 0 ? (
          <p className="roster-sheet__empty">No exercises in this workout.</p>
        ) : (
          <ol className="roster-summary__exercises">
            {rows.map((row, index) => (
              <li key={row.id} className="roster-summary__exercise">
                <span className="roster-summary__index">{index + 1}</span>
                <span className="roster-summary__bar" aria-hidden />
                <span className="roster-summary__identity">
                  <span className="roster-summary__name">{row.name}</span>
                  {row.sets && row.cue ? (
                    <span className="roster-summary__cue">{row.cue}</span>
                  ) : (
                    <>
                      {row.setLabel ? <span className="roster-summary__sets-label">{row.setLabel}</span> : null}
                      {row.cue ? <span className="roster-summary__cue">{row.cue}</span> : null}
                    </>
                  )}
                </span>
                {row.sets ? (
                  <ul className="roster-summary__setbox">
                    {row.sets.map((set) => (
                      <li key={set.label}>
                        <span>{set.label}</span>
                        <span>{set.detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : row.pill ? (
                  <span className="roster-summary__pill">{row.pill}</span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        {rows.length > 0 ? (
          <dl className="roster-summary__stats">
            <div>
              <DumbbellIcon className="h-4 w-4" />
              <dt>Total Exercises</dt>
              <dd>{rows.length}</dd>
            </div>
            <div>
              <LayersIcon className="h-4 w-4" />
              <dt>Total Sets</dt>
              <dd>{totalSets}</dd>
            </div>
            <div>
              <ClockIcon className="h-4 w-4" />
              <dt>Estimated Time</dt>
              <dd>{minutes != null ? `~${minutes} min` : "—"}</dd>
            </div>
            <div>
              <ChartIcon className="h-4 w-4" />
              <dt>Focus</dt>
              <dd>{focus}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

/** Workouts sent to one client: title and day in the list, summary on tap. */
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const name = relationship.clientFirstName.trim() || "Client";
  const selected = selectedId ? (workouts.find((workout) => workout.id === selectedId) ?? null) : null;
  const dismissSheet = useCallback(() => {
    if (selectedIdRef.current) {
      setSelectedId(null);
      return;
    }
    onClose();
  }, [onClose]);

  const sorted = [...workouts].sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  const upcoming = sorted.filter((item) => item.dateKey >= todayKey && item.status !== "completed");
  const past = sorted.filter((item) => !upcoming.includes(item)).reverse();

  async function remove(workout: CoachWorkout) {
    setError(null);
    const ok = await onRemoveWorkout(workout.id);
    if (!ok) setError("Only workouts they haven’t started can be removed.");
  }

  function renderWorkout(workout: CoachWorkout) {
    const title = workout.title.trim() || "Workout";
    const when = formatWorkoutDayHeading(workout.dateKey);
    const removable = workout.status === "sent";
    return (
      <li key={workout.id} className={cn("roster-plan__item", removable && "roster-plan__item--removable")}>
        <FastActivateButton
          className="roster-plan__open"
          aria-label={`View ${title} on ${when}`}
          onActivate={() => setSelectedId(workout.id)}
        >
          <span className="roster-plan__copy">
            <span className="roster-plan__title">{title}</span>
            <span className="roster-plan__date">{when}</span>
          </span>
          <ChevronRightIcon className="roster-plan__chevron h-4 w-4" />
        </FastActivateButton>
        {removable ? (
          <FastActivateButton
            className="roster-plan__remove"
            stopPropagation
            aria-label={`Remove ${title}`}
            onActivate={() => void remove(workout)}
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </FastActivateButton>
        ) : null}
      </li>
    );
  }

  return (
    <RosterSheet title={name} subtitle="Workouts you’ve sent" onClose={dismissSheet}>
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
      {selected ? (
        <SentWorkoutSummary workout={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </RosterSheet>
  );
}

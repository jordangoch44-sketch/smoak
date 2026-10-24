"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { exerciseLabel } from "@/data/exercise-display";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/ui/icons";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { CoachDayMark } from "@/components/dashboard/client/workouts/CoachDayMark";
import { ExerciseAvatar } from "@/components/dashboard/client/workouts/ExerciseAvatar";
import { coachDayMark } from "@/lib/coaching/coach-workout";
import {
  addMonths,
  buildMonthGrid,
  exerciseAssistsWithMachine,
  exerciseEffort,
  exerciseLoad,
  formatMonthTitle,
  formatWorkoutDayAriaLabel,
  formatWorkoutDayHeading,
  parseLocalDateKey,
  parseWorkoutSetCount,
  signAssistanceWeight,
  startOfMonth,
  toLocalDateKey,
  WEEKDAY_LABELS,
} from "@/lib/workouts/client-workout";
import { cn } from "@/lib/utils";
import type { ClientWorkoutExercise, ClientWorkoutSetLog } from "@/types/client-workout";
import type { CoachingRelationship, CoachWorkout } from "@/types/coaching";
import { RosterSheet } from "./RosterSheet";

function loggedExercise(workout: CoachWorkout, exercise: ClientWorkoutExercise) {
  const log = workout.clientLog?.find((entry) => entry.id === exercise.id);
  const filled = (log?.setLogs ?? []).some((set) => set.reps.trim() || set.weight.trim());
  return filled ? log : undefined;
}

function shownExercise(workout: CoachWorkout, exercise: ClientWorkoutExercise): ClientWorkoutExercise {
  const log = loggedExercise(workout, exercise);
  if (!log) return exercise;
  return {
    ...exercise,
    sets: log.sets,
    reps: log.reps,
    setLogs: log.setLogs,
    completed: log.completed ?? exercise.completed,
    note: log.note?.trim() ? log.note : exercise.note,
  };
}

/** Set rows the editor would show. A finished exercise shows every set checked. */
function viewLogs(exercise: ClientWorkoutExercise): ClientWorkoutSetLog[] {
  let rows: ClientWorkoutSetLog[];
  if (exercise.setLogs && exercise.setLogs.length > 0) {
    rows = exercise.setLogs.map((row) => ({ ...row }));
  } else {
    const count = parseWorkoutSetCount(exercise.sets);
    const reps = exercise.reps.trim();
    rows = count
      ? Array.from({ length: count }, () => ({ reps, weight: "" }))
      : [{ reps: "", weight: "" }];
  }
  if (exercise.completed && rows.every((row) => row.completed !== true)) {
    return rows.map((row) => ({ ...row, completed: true }));
  }
  return rows;
}

/** Order of paired groups on the day. The second group uses the alternate side line. */
function supersetTones(exercises: readonly ClientWorkoutExercise[]): Map<string, 0 | 1> {
  const counts = new Map<string, number>();
  for (const item of exercises) {
    if (!item.supersetId) continue;
    counts.set(item.supersetId, (counts.get(item.supersetId) ?? 0) + 1);
  }
  const tones = new Map<string, 0 | 1>();
  let index = 0;
  for (const item of exercises) {
    const id = item.supersetId;
    if (!id || tones.has(id) || (counts.get(id) ?? 0) < 2) continue;
    tones.set(id, index % 2 === 0 ? 0 : 1);
    index += 1;
  }
  return tones;
}

function SummaryExercise({
  exercise,
  inSuperset,
  supersetAlt,
}: {
  exercise: ClientWorkoutExercise;
  inSuperset: boolean;
  supersetAlt: boolean;
}) {
  const logs = viewLogs(exercise);
  const effort = exerciseEffort(exercise);
  const load = exerciseLoad(exercise);
  const showLoad = load !== null;
  const loadIsWeight = load === "lb" || load === "kg" || load === "speed";
  const assisted = load === "lb" && exerciseAssistsWithMachine(exercise);
  const name = exerciseLabel(exercise.name.trim()) || "Exercise";
  const note = (exercise.note ?? "").trim();
  const loadLabel =
    load === "kg" ? "Kg" : load === "bodyweight" ? "BW" : load === "speed" ? "Mph" : "Lbs";

  return (
    <article
      className={cn(
        "exercise-block",
        !showLoad && "exercise-block--bodyweight",
        inSuperset && "exercise-block--superset",
        inSuperset && supersetAlt && "exercise-block--superset-alt"
      )}
    >
      <div className="exercise-block__name-wrap">
        {inSuperset ? <p className="exercise-block__superset">Superset</p> : null}
        <div className="exercise-block__title">
          <span className="exercise-block__thumb">
            <ExerciseAvatar
              name={exercise.name}
              imageUrl={exercise.imageUrl}
              className="exercise-block__mark"
            />
          </span>
          <span className="exercise-block__name">{name}</span>
        </div>
        {note ? <p className="exercise-block__note">{note}</p> : null}
      </div>
      <div className="exercise-block__table">
        <div className="exercise-block__head">
          <span>Set</span>
          {showLoad ? <span className="exercise-block__unit">{loadLabel}</span> : null}
          <span className="exercise-block__unit">{effort === "distance" ? "Miles" : "Reps"}</span>
          <CheckIcon className="exercise-block__head-check" />
        </div>
        {logs.map((log, index) => {
          const weight = !loadIsWeight
            ? "—"
            : log.weight.trim()
              ? assisted
                ? signAssistanceWeight(log.weight) || log.weight.trim()
                : log.weight.trim()
              : assisted
                ? "-0"
                : "0";
          return (
            <div
              key={`${exercise.id}-${index}`}
              className={cn("exercise-block__row", log.completed && "exercise-block__row--done")}
            >
              <span className="exercise-block__set">{index + 1}</span>
              {showLoad ? <span className="exercise-block__input">{weight}</span> : null}
              <span className="exercise-block__input">{log.reps.trim() || "0"}</span>
              <span
                className={cn("exercise-block__check", log.completed && "exercise-block__check--on")}
                aria-hidden
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

/** Read-only workout, laid out like the editor at a smaller size. */
function SentWorkoutSummary({
  workout,
  canEdit,
  canRemove,
  onEdit,
  onRemove,
  onClose,
}: {
  workout: CoachWorkout;
  canEdit: boolean;
  canRemove: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const backdropDismiss = useOwnPointerDismiss(onClose);
  const exercises = workout.exercises.map((exercise) => shownExercise(workout, exercise));
  const tones = supersetTones(exercises);
  const when = formatWorkoutDayHeading(workout.dateKey);
  const title = workout.title.trim();
  const note = workout.note.trim();

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
      <div
        className="client-workouts-day roster-summary__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="client-workouts-day__top">
          <FastActivateButton
            className="client-workouts-day__back"
            aria-label="Back to calendar"
            onActivate={onClose}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </FastActivateButton>
          <div className="roster-summary__identity">
            <span className="roster-summary__chip">Workout summary</span>
            <h2 id={titleId} className="client-workouts-day__heading">
              {when}
            </h2>
          </div>
          {canEdit || canRemove ? (
            <div className="roster-summary__actions">
              {canEdit ? (
                <FastActivateButton
                  className="client-workouts-day__send client-workouts-day__send--save"
                  onActivate={onEdit}
                >
                  Edit
                </FastActivateButton>
              ) : null}
              {canRemove ? (
                <FastActivateButton className="roster-summary__remove" onActivate={onRemove}>
                  Remove
                </FastActivateButton>
              ) : null}
            </div>
          ) : (
            <span className="client-workouts-day__side" aria-hidden />
          )}
        </div>
        <div className="client-workouts-day__body">
          {title ? (
            <div className="client-workouts-titles__display">
              <span className="client-workouts-titles__display-text">{title}</span>
            </div>
          ) : null}
          {note ? <p className="roster-summary__note">{note}</p> : null}
          {exercises.length === 0 ? (
            <p className="roster-sheet__empty">No exercises in this workout.</p>
          ) : (
            exercises.map((exercise) => {
              const tone = exercise.supersetId ? tones.get(exercise.supersetId) : undefined;
              return (
                <SummaryExercise
                  key={exercise.id}
                  exercise={exercise}
                  inSuperset={tone !== undefined}
                  supersetAlt={tone === 1}
                />
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Workouts sent to one client, on a month calendar. A day opens that workout. */
export function ClientPlanSheet({
  relationship,
  workouts,
  initialWorkoutId = null,
  onSendWorkout,
  onEditWorkout,
  onRemoveWorkout,
  onRemoveClient,
  onClose,
}: {
  relationship: CoachingRelationship;
  workouts: readonly CoachWorkout[];
  /** Opens this workout's logged sets as soon as the sheet is shown. */
  initialWorkoutId?: string | null;
  onSendWorkout: (dateKey?: string) => void;
  onEditWorkout: (workout: CoachWorkout) => void;
  onRemoveWorkout: (workoutId: string) => Promise<boolean>;
  onRemoveClient: () => void;
  onClose: () => void;
}) {
  const [todayKey] = useState(() => toLocalDateKey(new Date()));
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialWorkoutId);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [armedDay, setArmedDay] = useState<string | null>(null);
  const armTimer = useRef<number | null>(null);
  const openedWorkout = useRef<string | null>(null);
  useEffect(() => {
    if (!initialWorkoutId || openedWorkout.current === initialWorkoutId) return;
    const workout = workouts.find((item) => item.id === initialWorkoutId);
    if (!workout) return;
    openedWorkout.current = initialWorkoutId;
    setSelectedId(initialWorkoutId);
    setMonth(startOfMonth(parseLocalDateKey(workout.dateKey)));
  }, [initialWorkoutId, workouts]);
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

  const byDate = useMemo(() => {
    const map = new Map<string, CoachWorkout[]>();
    for (const workout of workouts) {
      const list = map.get(workout.dateKey);
      if (list) list.push(workout);
      else map.set(workout.dateKey, [workout]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return map;
  }, [workouts]);
  const cells = useMemo(() => buildMonthGrid(month, todayKey), [month, todayKey]);
  const monthCells = useMemo(() => {
    const weeks: typeof cells[] = [];
    for (let index = 0; index < cells.length; index += 7) {
      weeks.push(cells.slice(index, index + 7));
    }
    return weeks.filter((week) => week.some((cell) => cell.inMonth)).flat();
  }, [cells]);
  const picked = pickedDay ? (byDate.get(pickedDay) ?? []) : [];

  function openDay(dateKey: string) {
    const dayWorkouts = byDate.get(dateKey) ?? [];
    const canSchedule =
      dayWorkouts.length === 0 && relationship.status === "active" && dateKey >= todayKey;
    if (dayWorkouts.length === 0 && !canSchedule) return;
    setArmedDay(dateKey);
    if (armTimer.current) window.clearTimeout(armTimer.current);
    armTimer.current = window.setTimeout(() => {
      armTimer.current = null;
      setArmedDay(null);
      if (dayWorkouts.length === 0) {
        onSendWorkout(dateKey);
        return;
      }
      setPickedDay(dayWorkouts.length > 1 ? dateKey : null);
      if (dayWorkouts.length === 1) setSelectedId(dayWorkouts[0]!.id);
    }, 220);
  }

  useEffect(() => {
    return () => {
      if (armTimer.current) window.clearTimeout(armTimer.current);
    };
  }, []);

  async function remove(workout: CoachWorkout) {
    setError(null);
    const ok = await onRemoveWorkout(workout.id);
    if (!ok) {
      setError("Only workouts they haven’t started can be removed.");
      return;
    }
    setSelectedId(null);
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
    <RosterSheet title={`${name} workout calendar`} onClose={dismissSheet}>
      <div className="client-workouts-page-cal">
        <div className="client-workouts-month">
          <FastActivateButton
            className="client-workouts-month__nav"
            aria-label="Previous month"
            onActivate={() => {
              setPickedDay(null);
              setMonth((current) => addMonths(current, -1));
            }}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </FastActivateButton>
          <h3 className="client-workouts-month__title">{formatMonthTitle(month)}</h3>
          <FastActivateButton
            className="client-workouts-month__nav"
            aria-label="Next month"
            onActivate={() => {
              setPickedDay(null);
              setMonth((current) => addMonths(current, 1));
            }}
          >
            <ChevronRightIcon className="h-5 w-5" />
          </FastActivateButton>
        </div>
        <div className="client-workouts-weekdays" aria-hidden>
          {WEEKDAY_LABELS.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        <div className="client-workouts-cal" role="grid" aria-label={`${name}'s workouts`}>
          {monthCells.map((cell) => {
            if (!cell.inMonth) {
              return <span key={cell.dateKey} className="client-workouts-cal__day client-workouts-cal__day--blank" aria-hidden />;
            }
            const dayWorkouts = byDate.get(cell.dateKey) ?? [];
            const mark = coachDayMark(dayWorkouts);
            const titles = dayWorkouts.map((workout) => workout.title.trim() || "Workout").join(", ");
            const when = formatWorkoutDayAriaLabel(cell.dateKey);
            const canAdd =
              dayWorkouts.length === 0 &&
              relationship.status === "active" &&
              cell.dateKey >= todayKey;
            const label = titles
              ? `${when}, ${titles}`
              : canAdd
                ? `Add a workout on ${when}`
                : when;
            return (
              <FastActivateButton
                key={cell.dateKey}
                className={cn(
                  "client-workouts-cal__day",
                  cell.isToday && "client-workouts-cal__day--today",
                  canAdd && !cell.isToday && "client-workouts-cal__day--open",
                  armedDay === cell.dateKey && "client-workouts-cal__day--armed",
                  pickedDay === cell.dateKey && "client-workouts-cal__day--selected"
                )}
                aria-label={label}
                aria-current={cell.isToday ? "date" : undefined}
                onActivate={() => openDay(cell.dateKey)}
              >
                <span className="client-workouts-cal__num">{cell.day}</span>
                {mark ? (
                  <span className="client-workouts-cal__marks" aria-hidden>
                    <CoachDayMark done={mark === "done"} />
                  </span>
                ) : (
                  <span className="client-workouts-cal__dot" aria-hidden />
                )}
              </FastActivateButton>
            );
          })}
        </div>
      </div>
      {picked.length > 1 ? (
        <div className="roster-plan">
          <p className="roster-plan__heading">{formatWorkoutDayHeading(picked[0]!.dateKey)}</p>
          <ul className="roster-plan__list">{picked.map(renderWorkout)}</ul>
        </div>
      ) : null}
      {workouts.length === 0 ? <p className="roster-sheet__empty">No workouts sent yet.</p> : null}
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
        <SentWorkoutSummary
          workout={selected}
          canEdit={selected.status === "sent" && selected.dateKey >= todayKey}
          canRemove={selected.status === "sent"}
          onEdit={() => onEditWorkout(selected)}
          onRemove={() => void remove(selected)}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </RosterSheet>
  );
}

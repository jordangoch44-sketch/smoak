"use client";

import { useState, useRef } from "react";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";
import { ExerciseAvatar } from "@/components/dashboard/client/workouts/ExerciseAvatar";
import { ExerciseHowToSheet } from "@/components/dashboard/client/workouts/ExerciseHowToSheet";
import { SwipeToRemove } from "@/components/dashboard/client/workouts/SwipeToRemove";
import { exerciseLabel } from "@/data/exercise-display";
import { formatExerciseName } from "@/data/workout-exercise-library";
import { isKnownExercise } from "@/lib/workouts/exercise-catalog";
import {
  createWorkoutExerciseId,
  exerciseAssistsWithMachine,
  exerciseWithSetLogs,
  exerciseEffort,
  exerciseLoad,
  nextExerciseEffort,
  nextExerciseLoad,
  EXERCISE_NOTE_MAX_LENGTH,
  formatPreviousSet,
  MAX_WORKOUT_SETS,
  parseWorkoutSetCount,
  previousSetsForExercise,
  sanitizeExerciseNote,
  sanitizeWorkoutCount,
  sanitizeWorkoutWeight,
  signAssistanceWeight,
  type ExerciseSetMemory,
} from "@/lib/workouts/client-workout";
import { cn } from "@/lib/utils";
import type { ClientWorkoutExercise, ClientWorkoutSetLog } from "@/types/client-workout";

/** Set rows to show. Legacy "3 × 8" becomes three rows. A finished exercise shows every set checked. */
function logsOf(exercise: ClientWorkoutExercise): ClientWorkoutSetLog[] {
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

function DotsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}

function UnitSwitch({
  label,
  next,
  onPress,
}: {
  label: string;
  next: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      className="exercise-block__unit"
      aria-label={`${label}. Change to ${next}.`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onPress}
    >
      {label}
    </button>
  );
}

/** Set table: name, notes, then set / previous / lbs / reps / check. */
export function ExerciseSetBlock({
  exercise,
  prior = [],
  autoFocus = false,
  inSuperset = false,
  supersetAlt = false,
  onChange,
  onOpenMenu,
}: {
  exercise: ClientWorkoutExercise;
  /** Earlier sessions, newest first. Last Time shows the last logged sets. */
  prior?: readonly ExerciseSetMemory[];
  autoFocus?: boolean;
  inSuperset?: boolean;
  /** Second paired group on the day. Uses the warm side line. */
  supersetAlt?: boolean;
  /** `commit` writes the day. Name keystrokes stay local until the field blurs. */
  onChange: (exercise: ClientWorkoutExercise, commit: boolean) => void;
  onOpenMenu: () => void;
}) {
  const setIds = useRef<string[]>([]);
  const logs = logsOf(exercise);
  const previous = previousSetsForExercise(prior, exercise.name);
  const effort = exerciseEffort(exercise);
  const load = exerciseLoad(exercise);
  const showLoad = load !== null;
  const loadIsWeight = load === "lb" || load === "kg";
  const assisted = load === "lb" && exerciseAssistsWithMachine(exercise);
  const [howToOpen, setHowToOpen] = useState(false);
  const named = exerciseLabel(exercise.name);
  const fromLibrary = Boolean(exercise.name.trim() && isKnownExercise(exercise.name));

  function openHowTo() {
    if (named) setHowToOpen(true);
  }

  function commitNote(value: string) {
    const note = sanitizeExerciseNote(value).trim();
    onChange({ ...exercise, note }, Boolean(exercise.name.trim()));
  }

  function commitName(name: string) {
    const next = formatExerciseName(name);
    if (next === exercise.name) {
      if (next) onChange(exercise, true);
      return;
    }
    onChange({ ...exercise, name: next }, Boolean(next));
  }

  function writeLogs(next: ClientWorkoutSetLog[], commit: boolean) {
    const rows = assisted
      ? next.map((log) => ({ ...log, weight: signAssistanceWeight(log.weight) }))
      : next;
    onChange(exerciseWithSetLogs(exercise, rows), commit && Boolean(exercise.name.trim()));
  }

  function patchLog(index: number, patch: Partial<ClientWorkoutSetLog>) {
    const next = logs.map((log, i) => (i === index ? { ...log, ...patch } : log));
    writeLogs(next, true);
  }

  function removeSet(index: number) {
    if (logs.length < 2) return;
    setIds.current.splice(index, 1);
    writeLogs(
      logs.filter((_, i) => i !== index),
      true
    );
  }

  while (setIds.current.length < logs.length) {
    setIds.current.push(createWorkoutExerciseId());
  }

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
          <button
            type="button"
            className="exercise-block__thumb"
            aria-label={named ? `How to do ${named}` : "Exercise photo"}
            disabled={!named}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={openHowTo}
          >
            <ExerciseAvatar
              name={exercise.name}
              imageUrl={exercise.imageUrl}
              className="exercise-block__mark"
            />
          </button>
          {fromLibrary ? (
            <button
              type="button"
              className="exercise-block__name"
              aria-label={`How to do ${named}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={openHowTo}
            >
              {named || "Exercise"}
            </button>
          ) : (
            <input
              className="exercise-block__name"
              value={exercise.name}
              autoFocus={autoFocus}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              enterKeyHint="done"
              placeholder="Exercise"
              aria-label="Exercise name"
              onPointerDown={(event) => event.stopPropagation()}
              onChange={(event) => onChange({ ...exercise, name: event.target.value }, false)}
              onBlur={(event) => commitName(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                event.currentTarget.blur();
              }}
            />
          )}
          <button
            type="button"
            className="exercise-block__more"
            aria-label={`Options for ${exercise.name.trim() || "exercise"}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onOpenMenu}
          >
            <DotsIcon />
          </button>
        </div>
        <input
          className="exercise-block__note"
          value={exercise.note ?? ""}
          maxLength={EXERCISE_NOTE_MAX_LENGTH}
          autoComplete="off"
          autoCorrect="on"
          enterKeyHint="done"
          placeholder="Add notes..."
          aria-label={named ? `Notes for ${named}` : "Exercise notes"}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) =>
            onChange(
              { ...exercise, note: sanitizeExerciseNote(event.target.value) },
              Boolean(exercise.name.trim())
            )
          }
          onBlur={(event) => commitNote(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.currentTarget.blur();
          }}
        />
      </div>

      <div className="exercise-block__table">
        <div className="exercise-block__head">
          <span>Set</span>
          <span className="exercise-block__head-previous">Last Time</span>
          {showLoad ? (
            <UnitSwitch
              label={load === "kg" ? "Kg" : load === "bodyweight" ? "BW" : "Lbs"}
              next={
                load === "lb" ? "kilograms" : load === "kg" ? "bodyweight" : "pounds"
              }
              onPress={() =>
                onChange(
                  { ...exercise, load: nextExerciseLoad(load ?? "lb") },
                  Boolean(exercise.name.trim())
                )
              }
            />
          ) : null}
          <UnitSwitch
            label={effort === "distance" ? "Distance" : "Reps"}
            next={effort === "distance" ? "reps" : "distance"}
            onPress={() =>
              onChange(
                { ...exercise, effort: nextExerciseEffort(effort) },
                Boolean(exercise.name.trim())
              )
            }
          />
          <CheckIcon className="exercise-block__head-check" />
        </div>
        {logs.map((log, index) => {
          const row = (
            <div className={cn("exercise-block__row", log.completed && "exercise-block__row--done")}>
              <span className="exercise-block__set">{index + 1}</span>
              <span className="exercise-block__previous">
                {showLoad
                  ? formatPreviousSet(
                      assisted && previous[index]
                        ? { ...previous[index], weight: signAssistanceWeight(previous[index].weight) }
                        : previous[index],
                      load
                    )
                  : previous[index]?.reps.trim() || "–"}
              </span>
              {showLoad ? (
                loadIsWeight ? (
                <input
                  className="exercise-block__input"
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  value={assisted ? signAssistanceWeight(log.weight) : log.weight}
                  placeholder={assisted ? "-0" : "0"}
                  aria-label={
                    assisted
                      ? `Set ${index + 1} assistance in pounds`
                      : load === "kg"
                        ? `Set ${index + 1} weight in kilograms`
                        : `Set ${index + 1} weight in pounds`
                  }
                  onChange={(event) =>
                    patchLog(index, {
                      weight: assisted
                        ? signAssistanceWeight(event.target.value)
                        : sanitizeWorkoutWeight(event.target.value),
                    })
                  }
                  onBlur={(event) => {
                    const next = (
                      assisted
                        ? signAssistanceWeight(event.currentTarget.value)
                        : sanitizeWorkoutWeight(event.currentTarget.value)
                    ).replace(/\.$/, "");
                    if (next !== log.weight) patchLog(index, { weight: next });
                  }}
                />
                ) : (
                  <span className="exercise-block__body" aria-hidden>
                    —
                  </span>
                )
              ) : null}
              <input
                className="exercise-block__input"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                value={log.reps}
                placeholder="0"
                aria-label={
                  effort === "distance"
                    ? `Set ${index + 1} distance`
                    : `Set ${index + 1} reps`
                }
                onChange={(event) =>
                  patchLog(index, {
                    reps:
                      effort === "distance"
                        ? sanitizeWorkoutWeight(event.target.value)
                        : sanitizeWorkoutCount(event.target.value, 4),
                  })
                }
              />
              <button
                type="button"
                className={cn(
                  "exercise-block__check",
                  log.completed && "exercise-block__check--on"
                )}
                aria-pressed={Boolean(log.completed)}
                aria-label={
                  log.completed
                    ? `Set ${index + 1} complete. Tap to undo.`
                    : `Mark set ${index + 1} complete`
                }
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => patchLog(index, { completed: !log.completed })}
              >
                <CheckIcon className="h-4 w-4" />
              </button>
            </div>
          );
          if (logs.length < 2) {
            return (
              <div key={setIds.current[index]} onPointerDown={(event) => event.stopPropagation()}>
                {row}
              </div>
            );
          }
          return (
            <SwipeToRemove
              key={setIds.current[index]}
              contain
              className="exercise-block__set-swipe"
              label={`Remove set ${index + 1}`}
              onRemove={() => removeSet(index)}
            >
              {row}
            </SwipeToRemove>
          );
        })}
      </div>

      <div className="exercise-block__actions">
        {logs.length < MAX_WORKOUT_SETS ? (
          <button
            type="button"
            className="exercise-block__add"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              const last = logs[logs.length - 1] ?? { reps: "", weight: "" };
              writeLogs(
                [
                  ...logs,
                  {
                    reps: last.reps,
                    weight: !showLoad || !loadIsWeight
                      ? ""
                      : assisted
                        ? signAssistanceWeight(last.weight)
                        : last.weight,
                  },
                ],
                true
              );
            }}
          >
            <PlusIcon className="h-4 w-4" />
            Add set
          </button>
        ) : null}
      </div>
      {howToOpen && named ? (
        <ExerciseHowToSheet
          name={named}
          imageUrl={exercise.imageUrl}
          onClose={() => setHowToOpen(false)}
        />
      ) : null}
    </article>
  );
}

"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";
import { ExerciseAvatar } from "@/components/dashboard/client/workouts/ExerciseAvatar";
import { ExerciseHowToSheet } from "@/components/dashboard/client/workouts/ExerciseHowToSheet";
import { SwipeToRemove } from "@/components/dashboard/client/workouts/SwipeToRemove";
import { exerciseLabel } from "@/data/exercise-display";
import { formatExerciseName } from "@/data/workout-exercise-library";
import { isKnownExercise } from "@/lib/workouts/exercise-catalog";
import {
  autoCapWords,
  createWorkoutExerciseId,
  exerciseAssistsWithMachine,
  exerciseWithSetLogs,
  exerciseEffort,
  exerciseLoad,
  exerciseUsesDistance,
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
  setIsWeightPersonalRecord,
  signAssistanceWeight,
  type ExerciseSetMemory,
} from "@/lib/workouts/client-workout";
import { cn } from "@/lib/utils";
import type { ClientWorkoutExercise, ClientWorkoutSetLog } from "@/types/client-workout";

/** A typed number, including 0. An empty box or a lone decimal is not filled. */
function setEntryFilled(value: string | undefined): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed || !/\d/.test(trimmed)) return false;
  return Number.isFinite(Number.parseFloat(trimmed));
}

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

export function UnitSwitchIcon() {
  return (
    <svg className="exercise-block__unit-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M6.2 13.2a7 7 0 0 1 9.2-7.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path fill="currentColor" d="M13.2 1.8 19.2 7.4 12.4 7.8Z" />
      <g transform="rotate(180 12 12)">
        <path
          d="M6.2 13.2a7 7 0 0 1 9.2-7.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path fill="currentColor" d="M13.2 1.8 19.2 7.4 12.4 7.8Z" />
      </g>
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
      <UnitSwitchIcon />
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
  const setAnchors = useRef<Array<HTMLSpanElement | null>>([]);
  const weightInputs = useRef<Array<HTMLInputElement | null>>([]);
  const repsInputs = useRef<Array<HTMLInputElement | null>>([]);
  const logs = logsOf(exercise);
  const logsRef = useRef(logs);
  logsRef.current = logs;
  const previous = previousSetsForExercise(prior, exercise.name);
  const effort = exerciseEffort(exercise);
  const load = exerciseLoad(exercise);
  const showLoad = load !== null;
  const run = exerciseUsesDistance(exercise.name);
  const loadIsWeight = load === "lb" || load === "kg" || load === "speed";
  const assisted = load === "lb" && exerciseAssistsWithMachine(exercise);
  const [howToOpen, setHowToOpen] = useState(false);
  const [prFlight, setPrFlight] = useState<{ key: string; index: number } | null>(null);
  const [gaps, setGaps] = useState<ReadonlySet<string>>(() => new Set());
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
    logsRef.current = rows;
    onChange(exerciseWithSetLogs(exercise, rows), commit && Boolean(exercise.name.trim()));
  }

  function patchLog(index: number, patch: Partial<ClientWorkoutSetLog>) {
    const next = logsRef.current.map((log, i) => (i === index ? { ...log, ...patch } : log));
    writeLogs(next, true);
  }

  function removeSet(index: number) {
    if (logs.length < 2) return;
    setIds.current.splice(index, 1);
    weightInputs.current.splice(index, 1);
    repsInputs.current.splice(index, 1);
    writeLogs(
      logs.filter((_, i) => i !== index),
      true
    );
  }

  /** Next set's pounds box. Never adds a set. Bodyweight moves to the next reps box. */
  function nextSetBox(index: number): HTMLInputElement | null {
    const pounds = weightInputs.current[index + 1];
    if (pounds?.isConnected) return pounds;
    if (showLoad && loadIsWeight) return null;
    const reps = repsInputs.current[index + 1];
    return reps?.isConnected ? reps : null;
  }

  function focusNextSetBox(index: number) {
    const next = nextSetBox(index);
    if (!next) return;
    next.focus({ preventScroll: true });
  }

  function onBoxKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    const next = nextSetBox(index);
    if (!next) return;
    event.preventDefault();
    next.focus({ preventScroll: true });
  }

  function gapKey(index: number, field: "weight" | "reps") {
    return `${setIds.current[index] ?? index}:${field}`;
  }

  function clearGap(index: number, field: "weight" | "reps") {
    const key = gapKey(index, field);
    setGaps((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function toggleSet(index: number) {
    const log = logsRef.current[index];
    if (!log) return;
    const completing = log.completed !== true;
    if (!completing) {
      patchLog(index, { completed: false });
      setPrFlight((current) => (current?.index === index ? null : current));
      return;
    }
    const weightMissing = showLoad && loadIsWeight && !setEntryFilled(log.weight);
    const repsMissing = !setEntryFilled(log.reps);
    if (weightMissing || repsMissing) {
      const weightKey = gapKey(index, "weight");
      const repsKey = gapKey(index, "reps");
      setGaps((prev) => {
        const next = new Set(prev);
        if (weightMissing) next.add(weightKey);
        else next.delete(weightKey);
        if (repsMissing) next.add(repsKey);
        else next.delete(repsKey);
        return next;
      });
      return;
    }
    clearGap(index, "weight");
    clearGap(index, "reps");
    patchLog(index, { completed: true });
    if (setIsWeightPersonalRecord(prior, exercise.name, logsRef.current, index, load)) {
      setPrFlight({
        key: `${setIds.current[index]}:${logsRef.current[index]?.weight ?? ""}`,
        index,
      });
    }
    // Same tap as the check, so iOS keeps the keyboard and moves it to the next pounds box.
    focusNextSetBox(index);
  }

  while (setIds.current.length < logs.length) {
    setIds.current.push(createWorkoutExerciseId());
  }

  const prKeys = logs.map((log, index) =>
    setIsWeightPersonalRecord(prior, exercise.name, logs, index, load)
      ? `${setIds.current[index]}:${log.weight}`
      : ""
  );

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
              onChange={(event) =>
                onChange({ ...exercise, name: autoCapWords(event.target.value) }, false)
              }
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
          autoCapitalize="words"
          enterKeyHint="done"
          placeholder="Add notes..."
          aria-label={named ? `Notes for ${named}` : "Exercise notes"}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) =>
            onChange(
              { ...exercise, note: autoCapWords(sanitizeExerciseNote(event.target.value)) },
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
              label={
                load === "kg" ? "Kg" : load === "bodyweight" ? "BW" : load === "speed" ? "Mph" : "Lbs"
              }
              next={
                load === "speed"
                  ? "pounds"
                  : load === "lb"
                    ? "kilograms"
                    : load === "kg"
                      ? "bodyweight"
                      : run
                        ? "miles per hour"
                        : "pounds"
              }
              onPress={() =>
                onChange(
                  { ...exercise, load: nextExerciseLoad(load ?? "lb", run) },
                  Boolean(exercise.name.trim())
                )
              }
            />
          ) : null}
          <UnitSwitch
            label={effort === "distance" ? "Miles" : "Reps"}
            next={effort === "distance" ? "reps" : "miles"}
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
          const isPr = Boolean(prKeys[index]);
          const flying = prFlight?.index === index;
          const row = (
            <div className={cn("exercise-block__row", log.completed && "exercise-block__row--done")}>
              <span
                ref={(node) => {
                  setAnchors.current[index] = node;
                }}
                className={cn("exercise-block__set", isPr && !flying && "exercise-block__set--pr")}
              >
                {isPr && !flying ? (
                  <SetPrStar />
                ) : (
                  index + 1
                )}
                {isPr ? (
                  <span className="sr-only">{`Set ${index + 1}, personal record`}</span>
                ) : null}
              </span>
              <span className="exercise-block__previous">
                {showLoad
                  ? formatPreviousSet(
                      assisted && previous[index]
                        ? { ...previous[index], weight: signAssistanceWeight(previous[index].weight) }
                        : previous[index],
                      load,
                      effort
                    )
                  : effort === "distance"
                    ? previous[index]?.reps.trim()
                      ? `${previous[index].reps.trim()} mi`
                      : "–"
                    : previous[index]?.reps.trim() || "–"}
              </span>
              {showLoad ? (
                loadIsWeight ? (
                <input
                  ref={(node) => {
                    weightInputs.current[index] = node;
                  }}
                  className={cn(
                    "exercise-block__input",
                    gaps.has(gapKey(index, "weight")) && "exercise-block__input--missing"
                  )}
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  aria-invalid={gaps.has(gapKey(index, "weight")) || undefined}
                  value={assisted ? signAssistanceWeight(log.weight) : log.weight}
                  placeholder={assisted ? "-0" : "0"}
                  aria-label={
                    load === "speed"
                      ? `Set ${index + 1} speed in miles per hour`
                      : assisted
                        ? `Set ${index + 1} assistance in pounds`
                        : load === "kg"
                          ? `Set ${index + 1} weight in kilograms`
                          : `Set ${index + 1} weight in pounds`
                  }
                  onChange={(event) => {
                    const weight = assisted
                      ? signAssistanceWeight(event.target.value)
                      : sanitizeWorkoutWeight(event.target.value);
                    patchLog(index, { weight });
                    if (setEntryFilled(weight)) clearGap(index, "weight");
                  }}
                  onBlur={(event) => {
                    const next = (
                      assisted
                        ? signAssistanceWeight(event.currentTarget.value)
                        : sanitizeWorkoutWeight(event.currentTarget.value)
                    ).replace(/\.$/, "");
                    if (next !== log.weight) patchLog(index, { weight: next });
                  }}
                  onKeyDown={(event) => onBoxKeyDown(index, event)}
                />
                ) : (
                  <span className="exercise-block__body" aria-hidden>
                    —
                  </span>
                )
              ) : null}
              <input
                ref={(node) => {
                  repsInputs.current[index] = node;
                }}
                className={cn(
                  "exercise-block__input",
                  gaps.has(gapKey(index, "reps")) && "exercise-block__input--missing"
                )}
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                aria-invalid={gaps.has(gapKey(index, "reps")) || undefined}
                value={log.reps}
                placeholder="0"
                aria-label={
                  effort === "distance"
                    ? `Set ${index + 1} distance in miles`
                    : `Set ${index + 1} reps`
                }
                onChange={(event) => {
                  const reps =
                    effort === "distance"
                      ? sanitizeWorkoutWeight(event.target.value)
                      : sanitizeWorkoutCount(event.target.value, 4);
                  patchLog(index, { reps });
                  if (setEntryFilled(reps)) clearGap(index, "reps");
                }}
                onKeyDown={(event) => onBoxKeyDown(index, event)}
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
                onClick={() => toggleSet(index)}
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
      {prFlight ? (
        <WorkoutPrFlight
          key={prFlight.key}
          getAnchor={() => setAnchors.current[prFlight.index] ?? null}
          onDone={() => setPrFlight(null)}
        />
      ) : null}
    </article>
  );
}

function PrStarGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 1.15 14.85 8.05 22.15 8.7 16.65 13.55 18.45 20.85 12 17.05 5.55 20.85 7.35 13.55 1.85 8.7 9.15 8.05Z"
      />
    </svg>
  );
}

function SetPrStar() {
  return (
    <span className="exercise-block__pr" aria-hidden>
      <PrStarGlyph />
      <span>PR</span>
    </span>
  );
}

function WorkoutPrFlight({
  getAnchor,
  onDone,
}: {
  getAnchor: () => HTMLElement | null;
  onDone: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const starRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const onDoneRef = useRef(onDone);
  const getAnchorRef = useRef(getAnchor);
  onDoneRef.current = onDone;
  getAnchorRef.current = getAnchor;

  useEffect(() => {
    const node = rootRef.current;
    const star = starRef.current;
    const label = labelRef.current;
    if (!node || !star) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const holdMs = 1000;
    const spinMs = reduce ? 0 : 500;
    const shrinkMs = reduce ? 0 : 420;
    let cancelled = false;
    let motion: Animation | null = null;
    const spin = reduce
      ? null
      : star.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], {
          duration: spinMs,
          delay: holdMs,
          easing: "cubic-bezier(0.55, 0.1, 0.25, 1)",
          fill: "forwards",
        });

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const target = getAnchorRef.current();
      if (!target?.isConnected || reduce) {
        onDoneRef.current();
        return;
      }
      const from = node.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      motion = node.animate(
        [
          { transform: "translate(-50%, -50%) scale(1)" },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.26)`,
          },
        ],
        { duration: shrinkMs, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" }
      );
      label?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: Math.round(shrinkMs * 0.55),
        easing: "ease-in",
        fill: "forwards",
      });
      motion.onfinish = () => {
        if (!cancelled) onDoneRef.current();
      };
    }, holdMs + spinMs);

    return () => {
      cancelled = true;
      spin?.cancel();
      if (motion) motion.onfinish = null;
      motion?.cancel();
      window.clearTimeout(timer);
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div ref={rootRef} className="workout-pr-flight" role="status" aria-label="New personal record">
      <div ref={starRef} className="workout-pr-flight__star">
        <PrStarGlyph />
      </div>
      <p ref={labelRef} className="workout-pr-flight__label" aria-hidden>
        New PR
      </p>
    </div>,
    document.body
  );
}

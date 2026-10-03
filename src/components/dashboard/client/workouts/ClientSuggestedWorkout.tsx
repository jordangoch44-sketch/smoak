"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ExerciseAvatar } from "@/components/dashboard/client/workouts/ExerciseAvatar";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  CalendarIcon,
  ChevronDownIcon,
  RefreshIcon,
  ShuffleIcon,
} from "@/components/ui/icons";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import {
  createWorkoutExerciseId,
  isWorkoutDateKey,
  toLocalDateKey,
} from "@/lib/workouts/client-workout";
import {
  generateSuggestedWorkout,
  SUGGESTED_FOCUS_OPTIONS,
  suggestedFocusLabel,
  type SuggestedFocus,
} from "@/lib/workouts/suggested-workout";
import { ClientWorkoutsModal } from "./ClientWorkoutsModal";

const noopSubscribe = () => () => {};

function isTouchPicker(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

/** Random workout generator. Start drops it into today; Add to calendar picks a day. */
export function ClientSuggestedWorkout({
  userId,
  onPaste,
}: {
  userId: string;
  onPaste?: (fromDateKey: string) => void;
}) {
  const { log, saveDay } = useClientWorkouts(userId);
  // Today’s date seeds the pick; build only in the browser.
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [focus, setFocus] = useState<SuggestedFocus>("full");
  const [shuffles, setShuffles] = useState(0);
  const [swaps, setSwaps] = useState<number[]>([]);
  const [openDateKey, setOpenDateKey] = useState<string | null>(null);

  const plan = useMemo(() => {
    if (!inBrowser) return null;
    const todayKey = toLocalDateKey(new Date());
    return {
      todayKey,
      exercises: generateSuggestedWorkout(focus, `${todayKey}:${shuffles}`, swaps),
    };
  }, [inBrowser, focus, shuffles, swaps]);

  function changeFocus(next: SuggestedFocus) {
    setFocus(next);
    setSwaps([]);
  }

  function shuffle() {
    setShuffles((count) => count + 1);
    setSwaps([]);
  }

  function swap(index: number) {
    setSwaps((current) => {
      const next = [...current];
      next[index] = (next[index] ?? 0) + 1;
      return next;
    });
  }

  /** Appends to whatever is already logged that day, then opens it. */
  function addToDay(dateKey: string) {
    if (!plan) return;
    const existing = log.days[dateKey];
    const added = plan.exercises.map((exercise) => ({
      id: createWorkoutExerciseId(),
      ...exercise,
    }));
    const saved = saveDay(
      dateKey,
      [...(existing?.exercises ?? []), ...added],
      existing?.title || suggestedFocusLabel(focus),
      existing?.cardio ?? null
    );
    if (saved) setOpenDateKey(dateKey);
  }

  function commitPickedDay(input: HTMLInputElement) {
    if (!plan) return;
    const dateKey = input.value;
    input.value = plan.todayKey;
    if (isWorkoutDateKey(dateKey)) addToDay(dateKey);
  }

  return (
    <>
      <div className="client-suggested">
        <div className="client-suggested__top">
          <p className="client-suggested__eyebrow">Generator</p>
          <label className="client-suggested__focus">
            <span className="client-suggested__focus-label">{suggestedFocusLabel(focus)}</span>
            <ChevronDownIcon className="client-suggested__focus-icon" />
            <select
              aria-label="Workout focus"
              value={focus}
              onChange={(event) => changeFocus(event.target.value as SuggestedFocus)}
            >
              {SUGGESTED_FOCUS_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <FastActivateButton
            className="client-suggested__shuffle"
            aria-label="Shuffle workout"
            onActivate={shuffle}
          >
            <ShuffleIcon />
          </FastActivateButton>
        </div>

        <ol className="client-suggested__list">
          {(plan?.exercises ?? []).map((exercise, index) => (
            <li key={`${index}-${exercise.name}`} className="client-suggested__row">
              <ExerciseAvatar name={exercise.name} className="client-suggested__mark" />
              <span className="client-suggested__name">{exercise.name}</span>
              <span className="client-suggested__scheme">
                {exercise.sets} × {exercise.reps}
              </span>
              <FastActivateButton
                className="client-suggested__swap"
                aria-label={`Swap ${exercise.name}`}
                onActivate={() => swap(index)}
              >
                <RefreshIcon className="h-3.5 w-3.5" />
              </FastActivateButton>
            </li>
          ))}
        </ol>

        <div className="client-suggested__actions">
          <FastActivateButton
            className="client-suggested__start"
            disabled={!plan}
            onActivate={() => plan && addToDay(plan.todayKey)}
          >
            Start workout
          </FastActivateButton>
          <label className="client-suggested__schedule">
            <CalendarIcon className="h-4 w-4" />
            Add to calendar
            {plan ? (
              <input
                key={plan.todayKey}
                type="date"
                aria-label="Add workout to a day"
                /* Starting on today stops iOS auto-filling it (and firing change) when the picker opens. */
                defaultValue={plan.todayKey}
                /* Touch commits when the picker closes (✓ on an unchanged day fires no change). */
                onBlur={(event) => {
                  if (isTouchPicker()) commitPickedDay(event.currentTarget);
                }}
                onChange={(event) => {
                  if (isTouchPicker()) return;
                  const input = event.currentTarget;
                  commitPickedDay(input);
                  input.blur();
                }}
              />
            ) : null}
          </label>
        </div>
      </div>

      <ClientWorkoutsModal
        userId={userId}
        open={openDateKey !== null}
        initialDateKey={openDateKey}
        onClose={() => setOpenDateKey(null)}
        onPaste={onPaste}
      />
    </>
  );
}

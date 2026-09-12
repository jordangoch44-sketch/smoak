"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CloseIcon } from "@/components/ui/icons";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { useToast } from "@/components/ui/toast";
import {
  blankWorkoutExercise,
  formatExerciseRange,
  formatWorkoutDayHeading,
  formatWorkoutShareText,
  shareOrCopyWorkoutText,
  sanitizeWorkoutTitle,
  WORKOUT_TITLE_PRESETS,
} from "@/lib/workouts/client-workout";
import { cn } from "@/lib/utils";
import type { ClientWorkoutDay, ClientWorkoutExercise } from "@/types/client-workout";

const KEYBOARD_INSET_PX = 80;

function readKeyboardViewport(): { inset: number; top: number; height: number } {
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const top = viewport?.offsetTop ?? 0;
  const inset = Math.max(0, window.innerHeight - height - top);
  return {
    inset: inset > KEYBOARD_INSET_PX ? inset : 0,
    top,
    height,
  };
}

function isWorkoutField(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement;
}

const KEYBOARD_SLIDE_MS = 480;

function scrollFieldInSheet(field: HTMLElement, sheet: HTMLElement) {
  const body = sheet.querySelector(".client-workouts-day__body");
  if (!(body instanceof HTMLElement)) return;
  const fieldRect = field.getBoundingClientRect();
  const bodyRect = body.getBoundingClientRect();
  const pad = 20;
  if (fieldRect.bottom > bodyRect.bottom - pad) {
    body.scrollTop += fieldRect.bottom - bodyRect.bottom + pad;
  } else if (fieldRect.top < bodyRect.top + pad) {
    body.scrollTop -= bodyRect.top + pad - fieldRect.top;
  }
}

interface ClientWorkoutDaySheetProps {
  dateKey: string;
  workout: ClientWorkoutDay | undefined;
  weekLabel: string;
  onClose: () => void;
  onSave: (exercises: ClientWorkoutExercise[], title: string) => boolean;
  onRemove: () => void;
  onCopy: () => void;
}

export function ClientWorkoutDaySheet({
  dateKey,
  workout,
  weekLabel,
  onClose,
  onSave,
  onRemove,
  onCopy,
}: ClientWorkoutDaySheetProps) {
  const { showToast } = useToast();
  const saved = Boolean(workout && workout.exercises.length > 0);
  const [exercises, setExercises] = useState<ClientWorkoutExercise[]>(() =>
    saved && workout
      ? workout.exercises.map((exercise) => ({ ...exercise }))
      : []
  );
  const [draft, setDraft] = useState<ClientWorkoutExercise>(blankWorkoutExercise);
  const [title, setTitle] = useState(() => workout?.title.trim() ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(!saved);
  const [error, setError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const tintDismiss = useOwnPointerDismiss(onClose);
  const [keyboard, setKeyboard] = useState({ inset: 0, top: 0, height: 0 });
  const keyboardOpen = keyboard.inset > 0;

  useEffect(() => {
    const existing = workout?.exercises ?? [];
    setExercises(existing.map((exercise) => ({ ...exercise })));
    setTitle(workout?.title.trim() ?? "");
    setDraft(blankWorkoutExercise());
    setEditingId(null);
    setComposerOpen(existing.length === 0);
    setError(null);
    // Only reset when the selected day changes — not after each save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  useEffect(() => {
    let slideTimer = 0;
    const insetOpen = { current: false };

    function syncKeyboard() {
      const next = readKeyboardViewport();
      insetOpen.current = next.inset > 0;
      setKeyboard(next);
    }

    function onFocusIn(event: FocusEvent) {
      if (!isWorkoutField(event.target)) return;
      const sheet = sheetRef.current;
      if (!sheet?.contains(event.target)) return;
      const field = event.target;
      window.clearTimeout(slideTimer);
      const delay = insetOpen.current ? 40 : KEYBOARD_SLIDE_MS;
      slideTimer = window.setTimeout(() => {
        scrollFieldInSheet(field, sheet);
      }, delay);
    }

    syncKeyboard();
    window.visualViewport?.addEventListener("resize", syncKeyboard);
    window.visualViewport?.addEventListener("scroll", syncKeyboard);
    window.addEventListener("resize", syncKeyboard);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.clearTimeout(slideTimer);
      window.visualViewport?.removeEventListener("resize", syncKeyboard);
      window.visualViewport?.removeEventListener("scroll", syncKeyboard);
      window.removeEventListener("resize", syncKeyboard);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [dateKey]);

  function persist(next: ClientWorkoutExercise[], nextTitle = title) {
    const named = next.filter((exercise) => exercise.name.trim());
    const cleanedTitle = sanitizeWorkoutTitle(nextTitle);
    if (named.length === 0 && !cleanedTitle) return false;
    return onSave(named, cleanedTitle);
  }

  function applyTitle(next: string) {
    const cleaned = sanitizeWorkoutTitle(next);
    setTitle(cleaned);
    persist(exercises, cleaned);
    setError(null);
  }

  function commitDraft(): ClientWorkoutExercise[] | null {
    const name = draft.name.trim();
    if (!name) {
      setError("Add an exercise name to save it.");
      return null;
    }
    const next = [
      ...exercises,
      {
        ...draft,
        name,
        sets: draft.sets.trim(),
        reps: draft.reps.trim(),
      },
    ];
    setExercises(next);
    setDraft(blankWorkoutExercise());
    setError(null);
    persist(next);
    return next;
  }

  function handleAddExercise() {
    if (editingId) {
      const current = exercises.find((exercise) => exercise.id === editingId);
      if (current && !current.name.trim()) {
        setError("Add an exercise name to save it.");
        return;
      }
      setEditingId(null);
      persist(exercises);
      setComposerOpen(true);
      setDraft(blankWorkoutExercise());
      setError(null);
      return;
    }
    if (!commitDraft()) return;
    setComposerOpen(true);
  }

  function handleSaveWorkout() {
    let next = exercises;
    if (composerOpen && draft.name.trim()) {
      const committed = commitDraft();
      if (!committed) return;
      next = committed;
    } else if (editingId) {
      const current = exercises.find((exercise) => exercise.id === editingId);
      if (current && !current.name.trim()) {
        setError("Add an exercise name to save it.");
        return;
      }
      setEditingId(null);
    }
    if (!persist(next)) {
      setError("Add an exercise or name this workout.");
      return;
    }
    setComposerOpen(false);
    setEditingId(null);
  }

  function updateExercise(
    id: string,
    patch: Partial<Pick<ClientWorkoutExercise, "name" | "sets" | "reps">>
  ) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === id ? { ...exercise, ...patch } : exercise
      )
    );
    setError(null);
  }

  function finishEditing(id: string) {
    const current = exercises.find((exercise) => exercise.id === id);
    if (current && !current.name.trim()) {
      setError("Add an exercise name to save it.");
      return;
    }
    setEditingId(null);
    persist(exercises);
    setError(null);
  }

  async function handleShare() {
    if (!workout) return;
    try {
      const result = await shareOrCopyWorkoutText(formatWorkoutShareText(workout));
      if (result === "copied") {
        showToast({ type: "success", message: "Workout copied." });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showToast({ type: "info", message: "Could not share this workout." });
    }
  }

  const heading = formatWorkoutDayHeading(dateKey);
  const hasBubbles = exercises.length > 0;
  const hasLoggedDay = hasBubbles || Boolean(title.trim());
  const showSavedActions = hasLoggedDay && !composerOpen && !editingId;

  return (
    <div
      className={cn(
        "client-workouts-day-root",
        keyboardOpen && "client-workouts-day-root--keyboard"
      )}
      style={
        {
          "--workout-keyboard-inset": `${keyboard.inset}px`,
        } as CSSProperties
      }
    >
      <button
        type="button"
        className="client-workouts-day-root__tint"
        aria-label="Close day"
        onPointerDown={tintDismiss.onPointerDown}
        onPointerUp={tintDismiss.onPointerUp}
        onClick={tintDismiss.onClick}
      />
      <div
        className="client-workouts-day-root__veil"
        style={{ height: keyboard.inset }}
        aria-hidden
      />
      <div
        ref={sheetRef}
        className="client-workouts-day"
        style={
          {
            transform: `translate3d(0, ${-keyboard.inset}px, 0)`,
          } as CSSProperties
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby={`client-workout-day-${dateKey}`}
      >
        <div className="client-workouts-day__top">
          <div>
            <h3
              id={`client-workout-day-${dateKey}`}
              className="client-workouts-day__heading"
            >
              {heading}
              {hasLoggedDay ? " ✓" : ""}
              {title.trim() ? (
                <span className="client-workouts-day__title-chip">{title.trim()}</span>
              ) : null}
            </h3>
            <p className="client-workouts-day__sub">{weekLabel}</p>
          </div>
          <FastActivateButton
            className="client-workouts-dialog__close"
            aria-label="Close day"
            onActivate={onClose}
          >
            <CloseIcon className="h-4 w-4" />
          </FastActivateButton>
        </div>

        <div className="client-workouts-day__body">
          <div className="client-workouts-titles" role="group" aria-label="Workout name">
            {WORKOUT_TITLE_PRESETS.map((preset) => (
              <FastActivateButton
                key={preset}
                className={cn(
                  "client-workouts-titles__chip",
                  title === preset && "client-workouts-titles__chip--on"
                )}
                onActivate={() => applyTitle(title === preset ? "" : preset)}
              >
                {preset}
              </FastActivateButton>
            ))}
          </div>
          <input
            className="client-workouts-titles__custom"
            value={
              (WORKOUT_TITLE_PRESETS as readonly string[]).includes(title)
                ? ""
                : title
            }
            autoComplete="off"
            autoCorrect="off"
            maxLength={24}
            placeholder="Or name it…"
            aria-label="Custom workout name"
            onChange={(event) => setTitle(sanitizeWorkoutTitle(event.target.value))}
            onBlur={() => applyTitle(title)}
          />

          {exercises.map((exercise) =>
            editingId === exercise.id ? (
              <ExerciseFields
                key={exercise.id}
                exercise={exercise}
                editing
                onChange={(patch) => updateExercise(exercise.id, patch)}
                onDone={() => finishEditing(exercise.id)}
                onRemove={() => {
                  const next = exercises.filter((item) => item.id !== exercise.id);
                  setExercises(next);
                  setEditingId(null);
                  if (next.length === 0 && !title.trim()) {
                    setComposerOpen(true);
                    onRemove();
                    return;
                  }
                  persist(next);
                }}
              />
            ) : (
              <article key={exercise.id} className="client-workouts-bubble">
                <FastActivateButton
                  className="client-workouts-bubble__edit"
                  onActivate={() => {
                    setEditingId(exercise.id);
                    setComposerOpen(false);
                    setError(null);
                  }}
                >
                  Edit
                </FastActivateButton>
                <p className="client-workouts-bubble__name">{exercise.name.trim()}</p>
                {formatExerciseRange(exercise) ? (
                  <p className="client-workouts-bubble__range">
                    {formatExerciseRange(exercise)}
                  </p>
                ) : null}
              </article>
            )
          )}

          {composerOpen && !editingId ? (
            <ExerciseFields
              exercise={draft}
              onChange={(patch) => {
                setDraft((current) => ({ ...current, ...patch }));
                setError(null);
              }}
            />
          ) : null}

          {error ? <p className="client-workouts-error">{error}</p> : null}
        </div>

        <div className="client-workouts-day__footer">
          {showSavedActions ? (
            <>
              <FastActivateButton
                className="client-workouts-btn"
                onActivate={() => {
                  setComposerOpen(true);
                  setDraft(blankWorkoutExercise());
                  setError(null);
                }}
              >
                Add exercise
              </FastActivateButton>
              <FastActivateButton
                className="client-workouts-btn client-workouts-btn--primary"
                onActivate={onCopy}
              >
                Copy to another day
              </FastActivateButton>
              <FastActivateButton
                className="client-workouts-btn"
                onActivate={() => void handleShare()}
              >
                Share
              </FastActivateButton>
              <FastActivateButton
                className="client-workouts-btn client-workouts-btn--ghost"
                onActivate={onRemove}
              >
                Remove workout
              </FastActivateButton>
            </>
          ) : (
            <>
              <FastActivateButton
                className="client-workouts-btn"
                onActivate={handleAddExercise}
              >
                Add exercise
              </FastActivateButton>
              <FastActivateButton
                className="client-workouts-btn client-workouts-btn--primary"
                onActivate={handleSaveWorkout}
              >
                Save workout
              </FastActivateButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ExerciseFields({
  exercise,
  editing = false,
  onChange,
  onDone,
  onRemove,
}: {
  exercise: ClientWorkoutExercise;
  editing?: boolean;
  onChange: (
    patch: Partial<Pick<ClientWorkoutExercise, "name" | "sets" | "reps">>
  ) => void;
  onDone?: () => void;
  onRemove?: () => void;
}) {
  const setsRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);

  function goNext(
    event: KeyboardEvent<HTMLInputElement>,
    next: HTMLInputElement | null
  ) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    next?.focus({ preventScroll: true });
  }

  return (
    <div className={editing ? "client-workouts-bubble client-workouts-bubble--edit" : "client-workouts-ex"}>
      {editing ? (
        <FastActivateButton
          className="client-workouts-bubble__edit"
          onActivate={() => onDone?.()}
        >
          Done
        </FastActivateButton>
      ) : null}
      <input
        className="client-workouts-ex__name"
        value={exercise.name}
        autoComplete="off"
        autoCorrect="off"
        enterKeyHint="next"
        placeholder="Exercise"
        aria-label="Exercise"
        onKeyDown={(event) => goNext(event, setsRef.current)}
        onChange={(event) => onChange({ name: event.target.value })}
      />
      <div className="client-workouts-ex__range">
        <input
          ref={setsRef}
          className="client-workouts-ex__sets"
          value={exercise.sets}
          autoComplete="off"
          enterKeyHint="next"
          placeholder="Sets"
          aria-label="Sets"
          onKeyDown={(event) => goNext(event, repsRef.current)}
          onChange={(event) => onChange({ sets: event.target.value })}
        />
        <span className="client-workouts-ex__times" aria-hidden>
          ×
        </span>
        <input
          ref={repsRef}
          className="client-workouts-ex__reps"
          value={exercise.reps}
          autoComplete="off"
          enterKeyHint="done"
          placeholder="8–10"
          aria-label="Reps"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }}
          onChange={(event) => onChange({ reps: event.target.value })}
        />
        {editing && onRemove ? (
          <FastActivateButton
            className="client-workouts-ex__remove"
            aria-label="Remove exercise"
            onActivate={onRemove}
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </FastActivateButton>
        ) : null}
      </div>
    </div>
  );
}

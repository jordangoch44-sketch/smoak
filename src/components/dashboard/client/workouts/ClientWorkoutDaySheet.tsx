"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CheckIcon, ChevronLeftIcon, PlusIcon, SendIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { ExerciseOptionsSheet } from "@/components/dashboard/client/workouts/ExerciseOptionsSheet";
import { ExercisePickerSheet } from "@/components/dashboard/client/workouts/ExercisePickerSheet";
import { ExerciseSetBlock } from "@/components/dashboard/client/workouts/ExerciseSetBlock";
import { SwipeToRemove } from "@/components/dashboard/client/workouts/SwipeToRemove";
import {
  createWorkoutExerciseId,
  emptyWorkoutCardio,
  exerciseWithSetLogs,
  formatCardioLine,
  formatWorkoutDayHeading,
  formatWorkoutShareText,
  freshExerciseBlock,
  parseWorkoutSetCount,
  rememberExerciseSets,
  shareOrCopyWorkoutText,
  sanitizeWorkoutCardio,
  sanitizeWorkoutTitle,
  type ExerciseSetMemory,
} from "@/lib/workouts/client-workout";
import { cn } from "@/lib/utils";
import type {
  ClientWorkoutCardio,
  ClientWorkoutDay,
  ClientWorkoutExercise,
} from "@/types/client-workout";

function isWorkoutField(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement;
}

const DISMISS_TAP_GUARD_MS = 400;

/** Close unmounts the sheet; iOS then fires the leftover click on the day under the X. */
function swallowTrailingDismissTap() {
  const block = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  document.addEventListener("click", block, { capture: true, once: true });
  window.setTimeout(() => {
    document.removeEventListener("click", block, true);
  }, DISMISS_TAP_GUARD_MS);
}

function setWorkoutKeyboardChrome(open: boolean) {
  document.documentElement.classList.toggle("client-workouts-keyboard", open);
  document.body.classList.toggle("client-workouts-keyboard", open);
}

function scrollFieldInSheet(field: HTMLElement, sheet: HTMLElement) {
  const body = sheet.querySelector(".client-workouts-day__body");
  if (!(body instanceof HTMLElement)) return;
  const fieldRect = field.getBoundingClientRect();
  const bodyRect = body.getBoundingClientRect();
  const pad = 28;
  let delta = 0;
  if (fieldRect.bottom > bodyRect.bottom - pad) {
    delta = fieldRect.bottom - bodyRect.bottom + pad;
  } else if (fieldRect.top < bodyRect.top + pad) {
    delta = fieldRect.top - bodyRect.top - pad;
  }
  if (Math.abs(delta) < 2) return;
  body.scrollTop += delta;
}

type DaySheetStep = "pick" | "cardio" | "workout";

interface ClientWorkoutDaySheetProps {
  dateKey: string;
  workout: ClientWorkoutDay | undefined;
  weekLabel: string;
  onClose: () => void;
  onSave: (
    exercises: ClientWorkoutExercise[],
    title: string,
    cardio?: ClientWorkoutCardio
  ) => boolean;
  onRemove: () => void;
  onCopy: () => void;
  /** Workouts a coach sent for this day, above the log. */
  coachSlot?: ReactNode;
  /**
   * Earlier exercises, newest first. Naming a new exercise copies that
   * session's sets, weights, and reps into the rows.
   */
  priorSets?: readonly ExerciseSetMemory[];
  /** A specialist building this for a client: nothing is logged, the footer sends it. */
  send?: {
    clientName: string;
    dateControl: ReactNode;
    /** Resolves to an error message, or null once sent. */
    onSend: (exercises: ClientWorkoutExercise[], title: string) => Promise<string | null>;
  };
}

export function ClientWorkoutDaySheet({
  dateKey,
  workout,
  weekLabel,
  onClose,
  onSave,
  onRemove,
  onCopy,
  coachSlot,
  priorSets = [],
  send,
}: ClientWorkoutDaySheetProps) {
  const { showToast } = useToast();
  const saved = Boolean(workout && workout.exercises.length > 0);
  const [exercises, setExercises] = useState<ClientWorkoutExercise[]>(() =>
    saved && workout
      ? workout.exercises.map((exercise) => ({ ...exercise }))
      : []
  );
  const [title, setTitle] = useState(() => workout?.title.trim() ?? "");
  const [cardio, setCardio] = useState<ClientWorkoutCardio>(
    () => workout?.cardio ?? emptyWorkoutCardio()
  );
  const [wantCardio, setWantCardio] = useState(false);
  const [wantWorkout, setWantWorkout] = useState(false);
  const [step, setStep] = useState<DaySheetStep>(() =>
    send ||
    (workout &&
      (workout.exercises.length > 0 ||
        Boolean(workout.title.trim()) ||
        Boolean(workout.cardio)))
      ? "workout"
      : "pick"
  );
  const [sending, setSending] = useState(false);
  const [focusExerciseId, setFocusExerciseId] = useState<string | null>(null);
  const [menuExerciseId, setMenuExerciseId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [typing, setTyping] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const checkKeyboardClosedRef = useRef<(() => void) | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;

  function requestClose() {
    if (closing) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && sheetRef.current?.contains(active)) {
      active.blur();
    }
    setWorkoutKeyboardChrome(false);
    swallowTrailingDismissTap();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
  }

  useEffect(() => {
    const shell = rootRef.current?.closest(".client-workouts-root");
    if (!(shell instanceof HTMLElement)) return;
    shell.classList.toggle("client-workouts-root--closing", closing);
  }, [closing]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      requestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closing]);

  useEffect(() => {
    const existing = workout?.exercises ?? [];
    setExercises(existing.map((exercise) => ({ ...exercise })));
    setTitle(workout?.title.trim() ?? "");
    setCardio(workout?.cardio ?? emptyWorkoutCardio());
    setWantCardio(false);
    setWantWorkout(false);
    setEditingTitle(false);
    setFocusExerciseId(null);
    setMenuExerciseId(null);
    setPickerOpen(false);
    setStep(
      send ||
        existing.length > 0 ||
        Boolean(workout?.title.trim()) ||
        Boolean(workout?.cardio)
        ? "workout"
        : "pick"
    );
    setError(null);
    // Only reset when the selected day changes — not after each save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  useEffect(() => {
    const rootNode = rootRef.current;
    const sheetNode = sheetRef.current;
    if (!rootNode || !sheetNode) return;
    const root: HTMLDivElement = rootNode;
    const sheet: HTMLDivElement = sheetNode;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    let displayed = 0;
    let target = 0;
    let raf = 0;
    let keyboardDismissed = false;
    let blurTimer = 0;
    let settleTimer = 0;
    let focusedField: HTMLElement | null = null;

    function apply(px: number) {
      root.style.setProperty("--workout-keyboard-inset", `${Math.max(0, px).toFixed(1)}px`);
    }

    function readInset() {
      const viewport = window.visualViewport;
      if (!viewport) return 0;
      const rect = root.getBoundingClientRect();
      const visibleBottom = viewport.offsetTop + viewport.height;
      return Math.max(0, rect.bottom - visibleBottom);
    }

    function stopEase() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function easeFrame() {
      const delta = target - displayed;
      if (Math.abs(delta) < 0.6) {
        displayed = target;
        apply(displayed);
        raf = 0;
        return;
      }
      displayed += delta * 0.2;
      apply(displayed);
      raf = requestAnimationFrame(easeFrame);
    }

    function follow(next: number) {
      target = next;
      if (!raf) raf = requestAnimationFrame(easeFrame);
    }

    function finishKeyboardMove() {
      if (window.scrollY > 1) window.scrollTo(0, 0);
      const field = focusedField;
      if (field && sheet.contains(field)) scrollFieldInSheet(field, sheet);
    }

    function syncKeyboard() {
      // Phone: leave the sheet still while the keyboard moves, then scroll the field once.
      if (touch) {
        if (keyboardDismissed) {
          window.clearTimeout(settleTimer);
          return;
        }
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(finishKeyboardMove, 80);
        return;
      }
      const next = keyboardDismissed ? 0 : readInset();
      if (reduceMotion) {
        stopEase();
        displayed = next;
        target = next;
        apply(displayed);
        return;
      }
      if (Math.abs(displayed - next) > 36) {
        follow(next);
        return;
      }
      stopEase();
      displayed = next;
      target = next;
      apply(displayed);
    }

    function onFocusIn(event: FocusEvent) {
      if (!isWorkoutField(event.target)) return;
      if (!sheet.contains(event.target)) return;
      window.clearTimeout(blurTimer);
      keyboardDismissed = false;
      focusedField = event.target;
      if (touch) {
        setTyping(true);
        setWorkoutKeyboardChrome(true);
      }
    }

    // Moving between fields (name → sets → reps) blurs for a moment; wait before treating it as
    // the keyboard closing. Then drop the inset at once so the footer grows from the bottom
    // behind the closing keyboard instead of above it.
    function onFocusOut() {
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        const active = document.activeElement;
        if (isWorkoutField(active) && sheet.contains(active)) return;
        keyboardDismissed = true;
        focusedField = null;
        window.clearTimeout(settleTimer);
        stopEase();
        displayed = 0;
        target = 0;
        apply(0);
        if (touch) {
          setTyping(false);
          setWorkoutKeyboardChrome(false);
        }
      }, 120);
    }

    displayed = readInset();
    target = displayed;
    apply(displayed);
    window.visualViewport?.addEventListener("resize", syncKeyboard);
    window.visualViewport?.addEventListener("scroll", syncKeyboard);
    window.addEventListener("resize", syncKeyboard);
    document.addEventListener("focusin", onFocusIn);
    sheet.addEventListener("focusout", onFocusOut);
    checkKeyboardClosedRef.current = onFocusOut;
    return () => {
      checkKeyboardClosedRef.current = null;
      stopEase();
      window.clearTimeout(settleTimer);
      window.clearTimeout(blurTimer);
      setWorkoutKeyboardChrome(false);
      root.style.removeProperty("--workout-keyboard-inset");
      window.visualViewport?.removeEventListener("resize", syncKeyboard);
      window.visualViewport?.removeEventListener("scroll", syncKeyboard);
      window.removeEventListener("resize", syncKeyboard);
      document.removeEventListener("focusin", onFocusIn);
      sheet.removeEventListener("focusout", onFocusOut);
    };
  }, [dateKey]);

  // Safari fires no focusout when a focused field unmounts (a slide step locking), so re-check
  // after every render while the footer is tucked away.
  useEffect(() => {
    if (typing) checkKeyboardClosedRef.current?.();
  });

  function persist(
    next: ClientWorkoutExercise[],
    nextTitle = title,
    nextCardio = cardio
  ) {
    const named = next.filter((exercise) => exercise.name.trim());
    const cleanedTitle = sanitizeWorkoutTitle(nextTitle);
    const cleanedCardio = sanitizeWorkoutCardio(nextCardio);
    if (named.length === 0 && !cleanedTitle && !cleanedCardio) return false;
    return onSave(named, cleanedTitle, cleanedCardio);
  }

  function applyTitle(next: string) {
    const cleaned = sanitizeWorkoutTitle(next);
    setTitle(cleaned);
    persist(exercises, cleaned);
    setError(null);
    return cleaned;
  }

  function confirmWorkoutTitle() {
    const field = titleInputRef.current;
    const cleaned = applyTitle(field?.value ?? title);
    if (!cleaned.trim()) return;
    setEditingTitle(false);
    if (document.activeElement === field) field?.blur();
  }

  function replaceExercise(next: ClientWorkoutExercise, commit: boolean) {
    const list = exercisesRef.current.map((item) => (item.id === next.id ? next : item));
    exercisesRef.current = list;
    setExercises(list);
    if (commit && next.name.trim()) persist(list);
    setError(null);
  }

  function handleAddExercise() {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    setPickerOpen(true);
    setError(null);
  }

  function addNamedExercise(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = { ...freshExerciseBlock(), name: trimmed };
    const remembered = rememberExerciseSets(
      [
        ...exercisesRef.current
          .filter((item) => item.name.trim())
          .map((item) => ({
            dateKey,
            name: item.name,
            sets: item.sets,
            reps: item.reps,
            setLogs: item.setLogs,
          })),
        ...priorSets,
      ],
      trimmed
    );
    const next = remembered ? exerciseWithSetLogs(created, remembered) : created;
    const list = [...exercisesRef.current, next];
    exercisesRef.current = list;
    setExercises(list);
    persist(list);
    setPickerOpen(false);
  }

  function handleSaveWorkout() {
    if (!persist(exercisesRef.current)) {
      setError("Add cardio, an exercise, or name this workout.");
      return;
    }
    requestClose();
  }

  async function handleSend() {
    if (!send || sending) return;
    const next = exercisesRef.current;
    persist(next);
    const named = next.filter((exercise) => exercise.name.trim());
    if (named.length === 0) {
      setError("Add at least one exercise to send.");
      return;
    }
    setError(null);
    setSending(true);
    const message = await send.onSend(named, sanitizeWorkoutTitle(title));
    setSending(false);
    if (message) {
      setError(message);
      return;
    }
    requestClose();
  }

  function handlePickContinue() {
    if (!wantCardio && !wantWorkout) {
      setError("Choose cardio, workout, or both.");
      return;
    }
    setError(null);
    if (wantCardio) {
      setStep("cardio");
      return;
    }
    setStep("workout");
  }

  function handleCardioContinue() {
    if (!cardio.type.trim() && !cardio.duration.trim()) {
      setError("Add a cardio type or duration.");
      return;
    }
    persist(exercises);
    setError(null);
    setStep("workout");
  }

  function handleRemoveCardio() {
    const cleared = emptyWorkoutCardio();
    setCardio(cleared);
    setError(null);
    const named = exercises.filter((exercise) => exercise.name.trim());
    const cleanedTitle = sanitizeWorkoutTitle(title);
    if (named.length === 0 && !cleanedTitle) {
      if (workout) {
        onRemove();
        return;
      }
      setStep("pick");
      return;
    }
    persist(exercises, title, cleared);
    setStep("workout");
  }

  function toggleCardioComplete() {
    const next = { ...cardio, completed: !cardio.completed };
    setCardio(next);
    persist(exercises, title, next);
  }

  function commitList(list: ClientWorkoutExercise[]) {
    exercisesRef.current = list;
    setExercises(list);
    if (list.some((item) => item.name.trim())) persist(list);
  }

  function moveExercise(id: string, direction: -1 | 1) {
    const list = [...exercisesRef.current];
    const index = list.findIndex((item) => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return;
    const [item] = list.splice(index, 1);
    if (!item) return;
    list.splice(nextIndex, 0, item);
    commitList(list);
  }

  function joinSuperset(sourceId: string, targetId: string) {
    const list = [...exercisesRef.current];
    const target = list.find((item) => item.id === targetId);
    if (!target) return;
    const groupId = target.supersetId || createWorkoutExerciseId();
    const tagged = list.map((item) =>
      item.id === sourceId ||
      item.id === targetId ||
      (target.supersetId && item.supersetId === target.supersetId)
        ? { ...item, supersetId: groupId }
        : item
    );
    const source = tagged.find((item) => item.id === sourceId);
    if (!source) return;
    const without = tagged.filter((item) => item.id !== sourceId);
    let insertAt = without.findIndex((item) => item.supersetId === groupId);
    if (insertAt < 0) insertAt = without.length;
    else {
      while (insertAt < without.length && without[insertAt]?.supersetId === groupId) insertAt += 1;
    }
    without.splice(insertAt, 0, source);
    commitList(without);
    setMenuExerciseId(null);
  }

  function leaveSuperset(id: string) {
    const current = exercisesRef.current.find((item) => item.id === id);
    const groupId = current?.supersetId;
    if (!groupId) return;
    const cleared = exercisesRef.current.map((item) =>
      item.id === id ? { ...item, supersetId: undefined } : item
    );
    const still = cleared.filter((item) => item.supersetId === groupId);
    const next =
      still.length < 2
        ? cleared.map((item) =>
            item.supersetId === groupId ? { ...item, supersetId: undefined } : item
          )
        : cleared;
    commitList(next);
    setMenuExerciseId(null);
  }

  function replaceExerciseName(id: string, name: string) {
    const current = exercisesRef.current.find((item) => item.id === id);
    if (!current) return;
    const memory: ExerciseSetMemory[] = [
      ...exercisesRef.current
        .filter((item) => item.id !== id && item.name.trim())
        .map((item) => ({
          dateKey,
          name: item.name,
          sets: item.sets,
          reps: item.reps,
          setLogs: item.setLogs,
        })),
      ...priorSets,
    ];
    const remembered = rememberExerciseSets(memory, name);
    const count = Math.max(
      1,
      current.setLogs?.length || parseWorkoutSetCount(current.sets) || 1
    );
    const logs = remembered ?? Array.from({ length: count }, () => ({ reps: "", weight: "" }));
    replaceExercise(exerciseWithSetLogs({ ...current, name }, logs), true);
    setMenuExerciseId(null);
  }

  function removeExercise(id: string) {
    const next = exercisesRef.current.filter((item) => item.id !== id);
    exercisesRef.current = next;
    setExercises(next);
    if (focusExerciseId === id) setFocusExerciseId(null);
    if (menuExerciseId === id) setMenuExerciseId(null);
    if (next.length === 0 && !title.trim() && !sanitizeWorkoutCardio(cardio)) {
      if (workout && (workout.exercises.length > 0 || workout.title.trim() || workout.cardio)) {
        onRemove();
      }
      return;
    }
    persist(next);
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

  const hasCardio = Boolean(sanitizeWorkoutCardio(cardio));
  const heading = formatWorkoutDayHeading(dateKey);
  const hasLoggedDay =
    exercises.some((exercise) => exercise.name.trim()) ||
    Boolean(title.trim()) ||
    hasCardio;
  const showSavedActions = hasLoggedDay && step === "workout";
  const menuExercise = exercises.find((item) => item.id === menuExerciseId) ?? null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "client-workouts-day-root",
        closing && "client-workouts-day-root--closing"
      )}
    >
      <div
        ref={sheetRef}
        className={cn(
          "client-workouts-day",
          send && "client-workouts-day--send",
          closing && "client-workouts-day--closing",
          typing && "client-workouts-day--typing"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`client-workout-day-${dateKey}`}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          if (!closing) return;
          if (event.animationName !== "client-workouts-day-down") return;
          onClose();
        }}
      >
        <div className="client-workouts-day__top">
          <FastActivateButton
            className="client-workouts-day__back"
            aria-label={send ? "Close" : "Back to calendar"}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onActivate={requestClose}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </FastActivateButton>
          <div>
            <h3
              id={`client-workout-day-${dateKey}`}
              className="client-workouts-day__heading"
            >
              {send ? `For ${send.clientName}` : heading}
              {hasLoggedDay && !send ? " ✓" : ""}
              {title.trim() ? (
                <span className="client-workouts-day__title-chip">{title.trim()}</span>
              ) : null}
              {hasCardio ? (
                <span className="client-workouts-day__title-chip client-workouts-day__title-chip--cardio">
                  {formatCardioLine(cardio)}
                </span>
              ) : null}
            </h3>
            {!send && (step === "cardio" || step === "workout") ? (
              <p
                className={cn(
                  "client-workouts-day__step",
                  step === "cardio" && "client-workouts-day__step--cardio"
                )}
              >
                {step === "cardio" ? "Cardio" : "Workout"}
              </p>
            ) : null}
            {send ? send.dateControl : <p className="client-workouts-day__sub">{weekLabel}</p>}
          </div>
          {send ? (
            <FastActivateButton
              className="client-workouts-day__send"
              aria-label={sending ? "Sending workout" : `Send to ${send.clientName}`}
              disabled={sending}
              onActivate={() => void handleSend()}
            >
              <SendIcon className="h-5 w-5" />
            </FastActivateButton>
          ) : null}
        </div>

        <div className="client-workouts-day__body">
          {coachSlot}
          {step === "pick" ? (
            <>
              <p className="client-workouts-pick__hint">
                Cardio, workout, or both.
              </p>
              <div className="client-workouts-pick" role="group" aria-label="Session type">
                <FastActivateButton
                  className={cn(
                    "client-workouts-pick__choice client-workouts-pick__choice--cardio",
                    wantCardio && "client-workouts-pick__choice--on"
                  )}
                  onActivate={() => {
                    setWantCardio((value) => !value);
                    setError(null);
                  }}
                >
                  Cardio
                </FastActivateButton>
                <FastActivateButton
                  className={cn(
                    "client-workouts-pick__choice",
                    wantWorkout && "client-workouts-pick__choice--on"
                  )}
                  onActivate={() => {
                    setWantWorkout((value) => !value);
                    setError(null);
                  }}
                >
                  Workout
                </FastActivateButton>
              </div>
            </>
          ) : null}

          {step === "cardio" ? (
            <div className="client-workouts-ex">
              <input
                className="client-workouts-ex__name"
                value={cardio.type}
                autoComplete="off"
                autoCorrect="off"
                maxLength={32}
                placeholder="Type (run, bike, walk…)"
                aria-label="Cardio type"
                onChange={(event) => {
                  setCardio((current) => ({
                    ...current,
                    type: event.target.value.slice(0, 32),
                  }));
                  setError(null);
                }}
              />
              <input
                className="client-workouts-ex__name"
                value={cardio.duration}
                autoComplete="off"
                autoCorrect="off"
                maxLength={16}
                placeholder="Duration (30 min)"
                aria-label="Cardio duration"
                onChange={(event) => {
                  setCardio((current) => ({
                    ...current,
                    duration: event.target.value.slice(0, 16),
                  }));
                  setError(null);
                }}
              />
            </div>
          ) : null}

          {step === "workout" ? (
            <>
              {hasCardio ? (
                <SwipeToRemove label="Remove cardio" onRemove={handleRemoveCardio}>
                  <article className="client-workouts-bubble client-workouts-bubble--cardio">
                    <FastActivateButton
                      className="client-workouts-bubble__edit"
                      onActivate={() => {
                        setStep("cardio");
                        setError(null);
                      }}
                    >
                      Edit
                    </FastActivateButton>
                    <p className="client-workouts-bubble__name">Cardio</p>
                    <FastActivateButton
                      className={cn(
                        "client-workouts-bubble__complete",
                        cardio.completed && "client-workouts-bubble__complete--done"
                      )}
                      aria-pressed={Boolean(cardio.completed)}
                      aria-label={
                        cardio.completed
                          ? "Cardio complete. Tap to undo."
                          : "Mark cardio complete"
                      }
                      onActivate={toggleCardioComplete}
                    >
                      {cardio.completed ? "✓ Complete" : "Complete"}
                    </FastActivateButton>
                    <p className="client-workouts-bubble__range">
                      {formatCardioLine(cardio)}
                    </p>
                  </article>
                </SwipeToRemove>
              ) : null}
              {hasCardio ? (
                <hr className="client-workouts-divider" aria-hidden />
              ) : null}

              {title.trim() && !editingTitle ? (
                <FastActivateButton
                  className="client-workouts-titles__display"
                  aria-label={`Workout name: ${title.trim()}. Tap to rename.`}
                  onActivate={() => {
                    flushSync(() => setEditingTitle(true));
                    titleInputRef.current?.focus({ preventScroll: true });
                  }}
                >
                  <span className="client-workouts-titles__display-text">{title.trim()}</span>
                </FastActivateButton>
              ) : (
                <input
                  ref={titleInputRef}
                  className="client-workouts-titles__custom"
                  value={title}
                  autoComplete="off"
                  autoCorrect="off"
                  enterKeyHint="done"
                  maxLength={24}
                  placeholder="Name this workout… (Push, pull, legs, etc.)"
                  aria-label="Workout name"
                  onChange={(event) => setTitle(sanitizeWorkoutTitle(event.target.value))}
                  onFocus={() => setEditingTitle(true)}
                  onBlur={() => confirmWorkoutTitle()}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    confirmWorkoutTitle();
                  }}
                />
              )}

              {exercises.length === 0 && (send || (title.trim() && !editingTitle)) ? (
                <div className="exercise-block exercise-block--ghost" aria-hidden>
                  <div className="exercise-block__name-wrap">
                    <div className="exercise-block__title">
                      <span className="exercise-block__name">Exercise</span>
                      <span className="exercise-block__more">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="6" cy="12" r="1.6" />
                          <circle cx="12" cy="12" r="1.6" />
                          <circle cx="18" cy="12" r="1.6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                  <div className="exercise-block__table">
                    <div className="exercise-block__head">
                      <span>Set</span>
                      <span>Lbs</span>
                      <span>Reps</span>
                      <CheckIcon className="exercise-block__head-check" />
                    </div>
                    <div className="exercise-block__row">
                      <span className="exercise-block__set">1</span>
                      <span className="exercise-block__input">0</span>
                      <span className="exercise-block__input">0</span>
                      <span className="exercise-block__check" />
                    </div>
                  </div>
                  <div className="exercise-block__actions">
                    <span className="exercise-block__add">
                      <PlusIcon className="h-4 w-4" />
                      Add set
                    </span>
                  </div>
                </div>
              ) : null}

              {exercises.map((exercise) => (
                <SwipeToRemove
                  key={exercise.id}
                  className="exercise-block-swipe"
                  label={`Remove ${exercise.name.trim() || "exercise"}`}
                  onRemove={() => removeExercise(exercise.id)}
                >
                  <ExerciseSetBlock
                    exercise={exercise}
                    prior={[
                      ...exercises
                        .filter((item) => item.id !== exercise.id && item.name.trim())
                        .map((item) => ({
                          dateKey,
                          name: item.name,
                          sets: item.sets,
                          reps: item.reps,
                          setLogs: item.setLogs,
                        })),
                      ...priorSets,
                    ]}
                    autoFocus={exercise.id === focusExerciseId}
                    inSuperset={
                      Boolean(exercise.supersetId) &&
                      exercises.some(
                        (item) =>
                          item.id !== exercise.id && item.supersetId === exercise.supersetId
                      )
                    }
                    onChange={replaceExercise}
                    onOpenMenu={() => setMenuExerciseId(exercise.id)}
                  />
                </SwipeToRemove>
              ))}
              {send ? (
                <FastActivateButton
                  className="exercise-block__add client-workouts-add-exercise"
                  disabled={sending}
                  onActivate={handleAddExercise}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add exercise
                </FastActivateButton>
              ) : null}
            </>
          ) : null}

          {error ? <p className="client-workouts-error">{error}</p> : null}
        </div>

        {send ? null : (
        <div
          className="client-workouts-day__footer"
          aria-hidden={typing || undefined}
          inert={typing || undefined}
        >
          <div className="client-workouts-day__footer-inner">
            {step === "pick" ? (
              <FastActivateButton
                className="client-workouts-btn client-workouts-btn--primary"
                onActivate={handlePickContinue}
              >
                Continue
              </FastActivateButton>
            ) : step === "cardio" ? (
              <>
                <FastActivateButton
                  className="client-workouts-btn client-workouts-btn--primary"
                  onActivate={handleCardioContinue}
                >
                  Continue to workout
                </FastActivateButton>
                <FastActivateButton
                  className="client-workouts-btn client-workouts-btn--ghost"
                  onActivate={handleRemoveCardio}
                >
                  Remove cardio
                </FastActivateButton>
              </>
            ) : showSavedActions ? (
              <>
                {!hasCardio ? (
                  <FastActivateButton
                    className="client-workouts-btn"
                    onActivate={() => {
                      setStep("cardio");
                      setError(null);
                    }}
                  >
                    Add cardio
                  </FastActivateButton>
                ) : null}
                <FastActivateButton
                  className="client-workouts-btn"
                  onActivate={handleAddExercise}
                >
                  <PlusIcon className="client-workouts-btn__plus" />
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
                  <PlusIcon className="client-workouts-btn__plus" />
                  Add exercise
                </FastActivateButton>
                <FastActivateButton
                  className="client-workouts-btn client-workouts-btn--primary"
                  onActivate={handleSaveWorkout}
                >
                  Save workout
                </FastActivateButton>
                {hasLoggedDay ? (
                  <FastActivateButton
                    className="client-workouts-btn client-workouts-btn--ghost"
                    onActivate={onRemove}
                  >
                    Remove workout
                  </FastActivateButton>
                ) : null}
              </>
            )}
          </div>
        </div>
        )}
      </div>
      {menuExercise ? (
        <ExerciseOptionsSheet
          exercise={menuExercise}
          exercises={exercises}
          prior={priorSets}
          onClose={() => setMenuExerciseId(null)}
          onMove={(direction) => moveExercise(menuExercise.id, direction)}
          onJoinSuperset={(targetId) => joinSuperset(menuExercise.id, targetId)}
          onLeaveSuperset={() => leaveSuperset(menuExercise.id)}
          onReplace={(name) => replaceExerciseName(menuExercise.id, name)}
          onRemove={() => removeExercise(menuExercise.id)}
        />
      ) : null}
      {pickerOpen ? (
        <ExercisePickerSheet
          prior={priorSets}
          onClose={() => setPickerOpen(false)}
          onPick={addNamedExercise}
        />
      ) : null}
    </div>
  );
}

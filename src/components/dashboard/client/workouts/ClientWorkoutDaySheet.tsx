"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronDownIcon, ChevronLeftIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import {
  ExerciseSlide,
  type ExerciseSlideHandle,
} from "@/components/dashboard/client/workouts/ExerciseSlide";
import { SwipeToRemove } from "@/components/dashboard/client/workouts/SwipeToRemove";
import {
  blankWorkoutExercise,
  emptyWorkoutCardio,
  formatCardioLine,
  formatExerciseDetailLines,
  formatWorkoutDayHeading,
  formatWorkoutShareText,
  shareOrCopyWorkoutText,
  sanitizeWorkoutCardio,
  sanitizeWorkoutExercise,
  sanitizeWorkoutTitle,
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
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  body.scrollTo({
    top: body.scrollTop + delta,
    behavior: reduce ? "auto" : "smooth",
  });
}

type DaySheetStep = "pick" | "cardio" | "workout";

/** Per-set lines start folded; the summary line ("4 sets") is the toggle. */
function ExerciseDetails({
  exercise,
  expanded,
  onToggle,
}: {
  exercise: ClientWorkoutExercise;
  expanded: boolean;
  onToggle: () => void;
}) {
  const lines = formatExerciseDetailLines(exercise);
  if (lines.length <= 1) {
    return lines.map((line, index) => (
      <p key={`${exercise.id}-line-${index}`} className="client-workouts-bubble__range">
        {line}
      </p>
    ));
  }
  const [summary, ...sets] = lines;
  return (
    <>
      <FastActivateButton
        className={cn(
          "client-workouts-bubble__sets-toggle",
          expanded && "client-workouts-bubble__sets-toggle--open"
        )}
        aria-expanded={expanded}
        aria-label={`${summary}. ${expanded ? "Hide" : "View"} sets`}
        onActivate={onToggle}
      >
        {summary}
        <ChevronDownIcon className="client-workouts-bubble__sets-chevron" />
      </FastActivateButton>
      {expanded
        ? sets.map((line, index) => (
            <p key={`${exercise.id}-line-${index}`} className="client-workouts-bubble__range">
              {line}
            </p>
          ))
        : null}
    </>
  );
}

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
  const [cardio, setCardio] = useState<ClientWorkoutCardio>(
    () => workout?.cardio ?? emptyWorkoutCardio()
  );
  const [wantCardio, setWantCardio] = useState(false);
  const [wantWorkout, setWantWorkout] = useState(false);
  const [step, setStep] = useState<DaySheetStep>(() =>
    workout &&
    (workout.exercises.length > 0 ||
      Boolean(workout.title.trim()) ||
      Boolean(workout.cardio))
      ? "workout"
      : "pick"
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(!saved);
  const [focusComposer, setFocusComposer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [typing, setTyping] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [expandedSetIds, setExpandedSetIds] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const checkKeyboardClosedRef = useRef<(() => void) | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<ExerciseSlideHandle>(null);

  function requestClose() {
    if (closing) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && sheetRef.current?.contains(active)) {
      active.blur();
    }
    swallowTrailingDismissTap();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
  }

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
    setDraft(blankWorkoutExercise());
    setEditingId(null);
    setFocusComposer(false);
    setComposerOpen(existing.length === 0);
    setStep(
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

    function apply(px: number) {
      root.style.setProperty("--workout-keyboard-inset", `${Math.max(0, px).toFixed(1)}px`);
    }

    function readInset() {
      const viewport = window.visualViewport;
      if (!viewport) return 0;
      const rect = root.getBoundingClientRect();
      const fromRect = rect.bottom - viewport.height;
      const fromLayout = window.innerHeight - viewport.offsetTop - viewport.height;
      return Math.max(0, fromRect, fromLayout);
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

    function syncKeyboard() {
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

    let scrollTimer = 0;
    function onFocusIn(event: FocusEvent) {
      if (!isWorkoutField(event.target)) return;
      if (!sheet.contains(event.target)) return;
      window.clearTimeout(blurTimer);
      keyboardDismissed = false;
      if (touch) setTyping(true);
      const field = event.target;
      const body = sheet.querySelector(".client-workouts-day__body");
      const lockedTop = body instanceof HTMLElement ? body.scrollTop : 0;
      window.clearTimeout(scrollTimer);
      requestAnimationFrame(() => {
        if (body instanceof HTMLElement) body.scrollTop = lockedTop;
      });
      scrollTimer = window.setTimeout(() => {
        scrollFieldInSheet(field, sheet);
      }, 380);
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
        stopEase();
        displayed = 0;
        target = 0;
        apply(0);
        if (touch) setTyping(false);
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
      window.clearTimeout(scrollTimer);
      window.clearTimeout(blurTimer);
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
  }

  function commitExercise(
    exercise: ClientWorkoutExercise,
    { openNext = false }: { openNext?: boolean } = {}
  ): ClientWorkoutExercise[] | null {
    const cleaned = sanitizeWorkoutExercise(exercise);
    if (!cleaned) {
      setError("Add an exercise name to save it.");
      return null;
    }
    const next = [...exercises, cleaned];
    if (!openNext) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && sheetRef.current?.contains(active)) {
        active.blur();
      }
    }
    setExercises(next);
    setDraft(blankWorkoutExercise());
    setComposerOpen(openNext);
    setFocusComposer(openNext);
    setError(null);
    persist(next);
    return next;
  }

  function applyLiveEdit(id: string): ClientWorkoutExercise[] | null {
    const live = slideRef.current?.snapshot();
    const current = live && live.id === id ? live : exercises.find((exercise) => exercise.id === id);
    if (!current?.name.trim()) {
      setError("Add an exercise name to save it.");
      return null;
    }
    const next = exercises.map((exercise) => (exercise.id === id ? current : exercise));
    setExercises(next);
    return next;
  }

  function handleAddExercise() {
    if (editingId) {
      const next = applyLiveEdit(editingId);
      if (!next) return;
      setEditingId(null);
      persist(next);
      setComposerOpen(true);
      setFocusComposer(true);
      setDraft(blankWorkoutExercise());
      setError(null);
      return;
    }
    const live = slideRef.current?.snapshot() ?? draft;
    if (!live.name.trim()) return;
    commitExercise(live, { openNext: true });
  }

  function handleSaveWorkout() {
    let next = exercises;
    if (editingId) {
      const edited = applyLiveEdit(editingId);
      if (!edited) return;
      next = edited;
      setEditingId(null);
    } else if (composerOpen) {
      const live = slideRef.current?.snapshot() ?? draft;
      if (live.name.trim()) {
        const cleaned = sanitizeWorkoutExercise(live);
        if (!cleaned) {
          setError("Add an exercise name to save it.");
          return;
        }
        next = [...exercises, cleaned];
        setExercises(next);
        setDraft(blankWorkoutExercise());
      }
    }
    if (!persist(next)) {
      setError("Add cardio, an exercise, or name this workout.");
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

  function toggleSetsExpanded(id: string) {
    setExpandedSetIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleExerciseComplete(id: string) {
    const next = exercises.map((exercise) =>
      exercise.id === id
        ? { ...exercise, completed: !exercise.completed }
        : exercise
    );
    setExercises(next);
    persist(next);
  }

  function updateExercise(
    id: string,
    patch: Partial<Pick<ClientWorkoutExercise, "name" | "sets" | "reps" | "setLogs">>
  ) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === id ? { ...exercise, ...patch } : exercise
      )
    );
    setError(null);
  }

  function removeExercise(id: string) {
    const next = exercises.filter((item) => item.id !== id);
    setExercises(next);
    if (editingId === id) setEditingId(null);
    if (next.length === 0 && !title.trim() && !sanitizeWorkoutCardio(cardio)) {
      setDraft(blankWorkoutExercise());
      setComposerOpen(true);
      onRemove();
      return;
    }
    persist(next);
  }

  function finishEditing(id: string) {
    const next = applyLiveEdit(id);
    if (!next) return;
    setEditingId(null);
    persist(next);
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

  const hasCardio = Boolean(sanitizeWorkoutCardio(cardio));
  const heading = formatWorkoutDayHeading(dateKey);
  const hasBubbles = exercises.length > 0;
  const hasLoggedDay = hasBubbles || Boolean(title.trim()) || hasCardio;
  const showSavedActions =
    hasLoggedDay && step === "workout" && !composerOpen && !editingId;

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
            aria-label="Back to calendar"
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
              {heading}
              {hasLoggedDay ? " ✓" : ""}
              {title.trim() ? (
                <span className="client-workouts-day__title-chip">{title.trim()}</span>
              ) : null}
              {hasCardio ? (
                <span className="client-workouts-day__title-chip client-workouts-day__title-chip--cardio">
                  {formatCardioLine(cardio)}
                </span>
              ) : null}
            </h3>
            {step === "cardio" || step === "workout" ? (
              <p
                className={cn(
                  "client-workouts-day__step",
                  step === "cardio" && "client-workouts-day__step--cardio"
                )}
              >
                {step === "cardio" ? "Cardio" : "Workout"}
              </p>
            ) : null}
            <p className="client-workouts-day__sub">{weekLabel}</p>
          </div>
        </div>

        <div className="client-workouts-day__body">
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
                  {title.trim()}
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
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    event.currentTarget.blur();
                  }}
                  onBlur={() => {
                    applyTitle(title);
                    setEditingTitle(false);
                  }}
                />
              )}

              {exercises.map((exercise, index) => (
                <div key={exercise.id} className="client-workouts-ex-row">
                  <span className="client-workouts-ex-row__index">
                    {index + 1}
                  </span>
                  {editingId === exercise.id ? (
                    <ExerciseSlide
                      ref={slideRef}
                      exercise={exercise}
                      editing
                      onChange={(patch) => updateExercise(exercise.id, patch)}
                      onDone={() => finishEditing(exercise.id)}
                      onRemove={() => removeExercise(exercise.id)}
                    />
                  ) : (
                    <SwipeToRemove
                      label={`Remove ${exercise.name.trim()}`}
                      onRemove={() => removeExercise(exercise.id)}
                    >
                      <article className="client-workouts-bubble">
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
                        <ExerciseDetails
                          exercise={exercise}
                          expanded={expandedSetIds.includes(exercise.id)}
                          onToggle={() => toggleSetsExpanded(exercise.id)}
                        />
                        <FastActivateButton
                          className={cn(
                            "client-workouts-bubble__complete",
                            exercise.completed &&
                              "client-workouts-bubble__complete--done"
                          )}
                          aria-pressed={Boolean(exercise.completed)}
                          aria-label={
                            exercise.completed
                              ? `${exercise.name.trim()} complete. Tap to undo.`
                              : `Mark ${exercise.name.trim()} complete`
                          }
                          onActivate={() => toggleExerciseComplete(exercise.id)}
                        >
                          {exercise.completed ? "✓ Complete" : "Complete"}
                        </FastActivateButton>
                      </article>
                    </SwipeToRemove>
                  )}
                </div>
              ))}

              {composerOpen && !editingId ? (
                <div className="client-workouts-ex-row">
                  <span className="client-workouts-ex-row__index">
                    {exercises.length + 1}
                  </span>
                  <ExerciseSlide
                    key={draft.id}
                    ref={slideRef}
                    exercise={draft}
                    autoFocus={focusComposer}
                    onChange={(patch) => {
                      setDraft((current) => ({ ...current, ...patch }));
                      setError(null);
                    }}
                    onFinished={(exercise) => {
                      commitExercise(exercise);
                    }}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {error ? <p className="client-workouts-error">{error}</p> : null}
        </div>

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
                  onActivate={() => {
                    setComposerOpen(true);
                    setFocusComposer(true);
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
      </div>
    </div>
  );
}

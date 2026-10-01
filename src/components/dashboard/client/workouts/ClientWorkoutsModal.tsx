"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
} from "@/components/ui/icons";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { useWorkoutEmailPreference } from "@/hooks/useWorkoutEmailPreference";
import { lockOverlayDocumentScroll } from "@/lib/lock-overlay-scroll";
import { cn } from "@/lib/utils";
import {
  addMonths,
  buildMonthGrid,
  currentWeekProgress,
  currentWeekStreak,
  formatGoalOptionLabel,
  formatMonthTitle,
  formatWeekProgressLabel,
  formatWorkoutDayAriaLabel,
  formatWorkoutDayHeading,
  hasCardioOnDay,
  hasStrengthOnDay,
  exerciseMemoryBefore,
  isWorkoutDateKey,
  parseLocalDateKey,
  startOfMonth,
  toLocalDateKey,
  workoutTitleOnDay,
  WEEKDAY_LABELS,
} from "@/lib/workouts/client-workout";
import type { ClientWorkoutCardio, ClientWorkoutExercise } from "@/types/client-workout";
import type { CoachWorkout } from "@/types/coaching";
import { CoachWorkoutCard } from "@/components/dashboard/client/coaching/CoachWorkoutCard";
import { useClientCoaching } from "@/hooks/useClientCoaching";
import {
  appendCoachExercises,
  coachWorkoutHistoryExercises,
  isCoachWorkoutInLog,
} from "@/lib/coaching/coach-workout";
import { ClientWorkoutDaySheet } from "./ClientWorkoutDaySheet";
import "@/styles/client-workouts.css";

const LOCK_CLASS = "client-workouts-open";
const WORKOUT_GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
const CARDIO_GOAL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7];

export function ClientWorkoutsModal({
  userId,
  open,
  onClose,
  initialDateKey = null,
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
  initialDateKey?: string | null;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [todayKey, setTodayKey] = useState(() => toLocalDateKey(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [pasteSourceKey, setPasteSourceKey] = useState<string | null>(null);
  const selectedDateKeyRef = useRef<string | null>(null);
  const pasteSourceKeyRef = useRef<string | null>(null);
  const ignoreDayTapUntilRef = useRef(0);
  const {
    log,
    setGoalDaysPerWeek,
    setCardioGoalDaysPerWeek,
    saveDay,
    removeDay,
    copyDayTo,
  } = useClientWorkouts(userId);
  const emailPreference = useWorkoutEmailPreference(userId);
  const coaching = useClientCoaching(userId);
  /** Bumped after Start so the day sheet remounts with the new exercises. */
  const [sheetVersion, setSheetVersion] = useState(0);
  const backdropDismiss = useOwnPointerDismiss(onClose);
  selectedDateKeyRef.current = selectedDateKey;
  pasteSourceKeyRef.current = pasteSourceKey;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setTodayKey(toLocalDateKey(now));
    setPasteSourceKey(null);
    if (initialDateKey && isWorkoutDateKey(initialDateKey)) {
      const date = parseLocalDateKey(initialDateKey);
      setMonth(startOfMonth(date));
      setSelectedDateKey(initialDateKey);
      return;
    }
    setMonth(startOfMonth(now));
    setSelectedDateKey(null);
  }, [open, initialDateKey]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add(LOCK_CLASS);
    document.documentElement.classList.add(LOCK_CLASS);
    const unlock = lockOverlayDocumentScroll();
    return () => {
      unlock();
      document.body.classList.remove(LOCK_CLASS);
      document.documentElement.classList.remove(LOCK_CLASS);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (selectedDateKeyRef.current) return;
      if (pasteSourceKeyRef.current) {
        setPasteSourceKey(null);
        return;
      }
      onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const cells = useMemo(
    () => buildMonthGrid(month, todayKey),
    [month, todayKey]
  );
  const today = parseLocalDateKey(todayKey);
  const progress = currentWeekProgress(log, today);
  const streak = currentWeekStreak(log, today);
  const weekLabel = formatWeekProgressLabel(progress, streak);

  function closeSelectedDay() {
    ignoreDayTapUntilRef.current = Date.now() + 400;
    setSelectedDateKey(null);
  }

  function handleDayActivate(dateKey: string) {
    if (Date.now() < ignoreDayTapUntilRef.current) return;
    if (pasteSourceKey) {
      const pasted = copyDayTo(pasteSourceKey, dateKey);
      if (!pasted) return;
      setPasteSourceKey(null);
      setMonth(startOfMonth(parseLocalDateKey(dateKey)));
      setSelectedDateKey(dateKey);
      return;
    }
    setMonth(startOfMonth(parseLocalDateKey(dateKey)));
    setSelectedDateKey(dateKey);
  }

  function handleSave(exercises: ClientWorkoutExercise[], title: string, cardio?: ClientWorkoutCardio) {
    if (!selectedDateKey) return false;
    return saveDay(selectedDateKey, exercises, title, cardio);
  }

  /** Coach workouts always log on the day they're done: today. */
  function startCoachWorkout(workout: CoachWorkout) {
    const existing = log.days[todayKey];
    const saved = saveDay(
      todayKey,
      appendCoachExercises(workout, existing?.exercises ?? []),
      existing?.title || workout.title,
      existing?.cardio ?? null
    );
    if (!saved) return;
    setMonth(startOfMonth(parseLocalDateKey(todayKey)));
    setSelectedDateKey(todayKey);
    setSheetVersion((version) => version + 1);
  }

  function hasPendingCoachWorkout(dateKey: string): boolean {
    return (coaching.workoutsByDate.get(dateKey) ?? []).some(
      (workout) => !isCoachWorkoutInLog(workout, log.days)
    );
  }

  const selectedCoachWorkouts = selectedDateKey
    ? (coaching.workoutsByDate.get(selectedDateKey) ?? [])
    : [];

  if (!mounted || !open || typeof document === "undefined") return null;

  return createPortal(
    <div className="client-workouts-root" role="presentation">
      <button
        type="button"
        className="client-workouts-root__backdrop"
        aria-label="Close workouts"
        onPointerDown={backdropDismiss.onPointerDown}
        onPointerUp={backdropDismiss.onPointerUp}
        onClick={backdropDismiss.onClick}
      />
      <div
        className={
          selectedDateKey && !pasteSourceKey
            ? "client-workouts-dialog client-workouts-dialog--day"
            : "client-workouts-dialog"
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="client-workouts-dialog__chrome">
          <div className="client-workouts-dialog__handle" aria-hidden />
          <div className="client-workouts-dialog__top">
            <h2 id={titleId} className="client-workouts-dialog__title">
              Workouts
            </h2>
            <FastActivateButton
              className="client-workouts-dialog__close"
              aria-label="Close"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onActivate={onClose}
            >
              <CloseIcon className="h-4 w-4" />
            </FastActivateButton>
          </div>
          <div className="client-workouts-dialog__stats">
            <p className="client-workouts-dialog__stat">
              Workouts{" "}
              <strong>
                {progress.workout.done} / {progress.workout.goal}
              </strong>
            </p>
            {progress.cardio ? (
              <p className="client-workouts-dialog__stat client-workouts-dialog__stat--cardio">
                Cardio{" "}
                <strong>
                  {progress.cardio.done} / {progress.cardio.goal}
                </strong>
              </p>
            ) : null}
            {streak > 0 ? (
              <p className="client-workouts-dialog__stat client-workouts-dialog__stat--streak">
                Streak <strong>{streak}-week</strong>
              </p>
            ) : null}
            <div className="client-workouts-dialog__goals">
              <label className="client-workouts-dialog__goal">
                Workout goal
                <select
                  aria-label="Workout goal days per week"
                  value={log.goalDaysPerWeek}
                  onChange={(event) =>
                    setGoalDaysPerWeek(Number(event.target.value))
                  }
                >
                  {WORKOUT_GOAL_OPTIONS.map((days) => (
                    <option key={days} value={days}>
                      {formatGoalOptionLabel(days)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="client-workouts-dialog__goal">
                Cardio goal
                <select
                  aria-label="Cardio goal days per week"
                  value={log.cardioGoalDaysPerWeek}
                  onChange={(event) =>
                    setCardioGoalDaysPerWeek(Number(event.target.value))
                  }
                >
                  {CARDIO_GOAL_OPTIONS.map((days) => (
                    <option key={days} value={days}>
                      {formatGoalOptionLabel(days)}
                    </option>
                  ))}
                </select>
              </label>
              {emailPreference.available ? (
                <FastActivateButton
                  role="switch"
                  aria-checked={emailPreference.enabled}
                  className="client-workouts-dialog__goal client-workouts-dialog__email"
                  onActivate={() =>
                    emailPreference.setWorkoutEmails(!emailPreference.enabled)
                  }
                >
                  Streak emails
                  <span
                    className={cn(
                      "client-workouts-switch",
                      emailPreference.enabled && "client-workouts-switch--on"
                    )}
                    aria-hidden
                  />
                </FastActivateButton>
              ) : null}
            </div>
          </div>
          {pasteSourceKey ? (
            <div className="client-workouts-paste">
              <p className="client-workouts-paste__copy">
                Paste “{formatWorkoutDayHeading(pasteSourceKey)}” — tap a day.
              </p>
              <FastActivateButton
                className="client-workouts-paste__cancel"
                onActivate={() => setPasteSourceKey(null)}
              >
                Cancel
              </FastActivateButton>
            </div>
          ) : null}
        </div>

        <div className="client-workouts-body">
          <div className="client-workouts-month">
            <FastActivateButton
              className="client-workouts-month__nav"
              aria-label="Previous month"
              onActivate={() => setMonth((current) => addMonths(current, -1))}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </FastActivateButton>
            <h3 className="client-workouts-month__title">
              {formatMonthTitle(month)}
            </h3>
            <FastActivateButton
              className="client-workouts-month__nav"
              aria-label="Next month"
              onActivate={() => setMonth((current) => addMonths(current, 1))}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </FastActivateButton>
          </div>

          <div className="client-workouts-weekdays" aria-hidden>
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>

          <div className="client-workouts-cal" role="grid" aria-label="Workout calendar">
            {cells.map((cell) => {
              const cardio = hasCardioOnDay(log, cell.dateKey);
              const strength = hasStrengthOnDay(log, cell.dateKey);
              const trained = cardio || strength;
              const dayTitle = workoutTitleOnDay(log, cell.dateKey);
              const selected = selectedDateKey === cell.dateKey;
              const coachPending = hasPendingCoachWorkout(cell.dateKey);
              const label = `${formatWorkoutDayAriaLabel(cell.dateKey)}${
                coachPending ? ", workout from your coach" : ""
              }`;
              const loggedLabel = cardio && strength
                ? `${label}, cardio and workout logged`
                : cardio
                  ? `${label}, cardio logged`
                  : strength
                    ? dayTitle
                      ? `${label}, ${dayTitle}`
                      : `${label}, workout logged`
                    : label;
              return (
                <FastActivateButton
                  key={cell.dateKey}
                  className={cn(
                    "client-workouts-cal__day",
                    !cell.inMonth && "client-workouts-cal__day--muted",
                    cell.isToday && "client-workouts-cal__day--today",
                    selected && "client-workouts-cal__day--selected",
                    Boolean(pasteSourceKey) && "client-workouts-cal__day--paste"
                  )}
                  aria-label={
                    pasteSourceKey
                      ? `Paste workout onto ${label}`
                      : loggedLabel
                  }
                  aria-current={cell.isToday ? "date" : undefined}
                  onActivate={() => handleDayActivate(cell.dateKey)}
                >
                  <span className="client-workouts-cal__num">{cell.day}</span>
                  {coachPending ? <span className="client-workouts-cal__coach" aria-hidden /> : null}
                  {trained ? (
                    <span className="client-workouts-cal__marks" aria-hidden>
                      {cardio ? (
                        <span className="client-workouts-cal__mark client-workouts-cal__mark--cardio">
                          <span className="client-workouts-cal__check">
                            <CheckIcon />
                          </span>
                        </span>
                      ) : null}
                      {strength ? (
                        <span className="client-workouts-cal__mark">
                          <span className="client-workouts-cal__check">
                            <CheckIcon />
                          </span>
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="client-workouts-cal__dot" aria-hidden />
                  )}
                </FastActivateButton>
              );
            })}
          </div>
        </div>

      </div>
      {selectedDateKey && !pasteSourceKey ? (
        <ClientWorkoutDaySheet
          key={`${selectedDateKey}:${sheetVersion}`}
          dateKey={selectedDateKey}
          coachSlot={
            selectedCoachWorkouts.length > 0 ? (
              <div className="coach-workout-stack">
                {selectedCoachWorkouts.map((workout) => (
                  <CoachWorkoutCard
                    key={workout.id}
                    workout={workout}
                    coachName={coaching.coachNameFor(workout)}
                    todayKey={todayKey}
                    inLog={isCoachWorkoutInLog(workout, log.days)}
                    onStart={() => startCoachWorkout(workout)}
                  />
                ))}
              </div>
            ) : null
          }
          workout={log.days[selectedDateKey]}
          priorSets={exerciseMemoryBefore(
            [
              ...Object.values(log.days).map((day) => ({
                dateKey: day.date,
                exercises: day.exercises,
              })),
              ...coaching.workouts.map((workout) => ({
                dateKey: workout.dateKey,
                exercises: coachWorkoutHistoryExercises(workout),
              })),
            ],
            selectedDateKey
          )}
          weekLabel={weekLabel}
          onClose={closeSelectedDay}
          onSave={handleSave}
          onRemove={() => {
            removeDay(selectedDateKey);
            closeSelectedDay();
          }}
          onCopy={() => {
            setPasteSourceKey(selectedDateKey);
            setSelectedDateKey(null);
          }}
        />
      ) : null}
    </div>,
    document.body
  );
}

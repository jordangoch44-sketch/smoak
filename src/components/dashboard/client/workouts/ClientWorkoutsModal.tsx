"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
import { lockOverlayDocumentScroll } from "@/lib/lock-overlay-scroll";
import { cn } from "@/lib/utils";
import {
  addMonths,
  buildMonthGrid,
  currentWeekProgress,
  currentWeekStreak,
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
import { useClientCoaching } from "@/hooks/useClientCoaching";
import {
  coachDayForSheet,
  coachDayMark,
  coachWorkoutHistoryExercises,
  coachWorkoutProgress,
} from "@/lib/coaching/coach-workout";
import { ClientWorkoutDaySheet } from "./ClientWorkoutDaySheet";
import { WorkoutNiceOverlay } from "./WorkoutNiceOverlay";
import { CoachDayMark } from "./CoachDayMark";
import "@/styles/client-workouts.css";

const LOCK_CLASS = "client-workouts-open";

export function ClientWorkoutsModal({
  userId,
  open,
  onClose,
  initialDateKey = null,
  onPaste,
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
  initialDateKey?: string | null;
  /** Page calendar handles the paste target, so this sheet never opens a second month. */
  onPaste?: (fromDateKey: string) => void;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [todayKey, setTodayKey] = useState(() => toLocalDateKey(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [pasteSourceKey, setPasteSourceKey] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const dismissNice = useCallback(() => setCelebrate(false), []);
  const selectedDateKeyRef = useRef<string | null>(null);
  const pasteSourceKeyRef = useRef<string | null>(null);
  const ignoreDayTapUntilRef = useRef(0);
  const ignoreBackdropUntilRef = useRef(0);
  const { log, saveDay, removeDay, copyDayTo } = useClientWorkouts(userId);
  const coaching = useClientCoaching(userId);
  /** Bumped after Start so the day sheet remounts with the new exercises. */
  const backdropDismiss = useOwnPointerDismiss(() => {
    if (Date.now() < ignoreBackdropUntilRef.current) return;
    onClose();
  });
  selectedDateKeyRef.current = selectedDateKey;
  pasteSourceKeyRef.current = pasteSourceKey;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    ignoreBackdropUntilRef.current = Date.now() + 450;
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

  const openedOnDay = Boolean(
    initialDateKey && isWorkoutDateKey(initialDateKey)
  );
  /** The workouts page already shows the month. This sheet is only the day. */
  const showCalendar = Boolean(pasteSourceKey) ? !onPaste : !openedOnDay;

  function closeSelectedDay() {
    ignoreDayTapUntilRef.current = Date.now() + 400;
    if (openedOnDay) {
      onClose();
      return;
    }
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

  const selectedCoachWorkouts = selectedDateKey
    ? (coaching.workoutsByDate.get(selectedDateKey) ?? [])
    : [];
  const selectedDay = selectedDateKey ? log.days[selectedDateKey] : undefined;
  const sheetWorkout = selectedDateKey
    ? coachDayForSheet(selectedDateKey, selectedDay, selectedCoachWorkouts)
    : undefined;
  const fromCoach = (() => {
    const names = [
      ...new Set(
        selectedCoachWorkouts
          .map((workout) => coaching.coachNameFor(workout).trim())
          .filter(Boolean)
      ),
    ];
    if (names.length > 0) return names.join(", ");
    return selectedCoachWorkouts.length > 0 ? "your coach" : null;
  })();
  const coachStillOpen = selectedCoachWorkouts.some((workout) => workout.status !== "completed");

  async function finishCoachWorkouts(exercises: ClientWorkoutExercise[]) {
    const open = selectedCoachWorkouts.filter((workout) => workout.status !== "completed");
    for (const workout of open) {
      const progress = coachWorkoutProgress(workout, exercises);
      const saved = await coaching.reportProgress(workout.id, "completed", progress.clientLog);
      if (!saved) return "Couldn’t finish the workout. Try again.";
    }
    return null;
  }

  function handleWorkoutFinished(message: string | null) {
    if (message) {
      setFinishError(message);
      return;
    }
    setFinishError(null);
    setCelebrate(true);
  }

  if (!mounted || typeof document === "undefined") return null;
  if (!open && !celebrate && !finishError) return null;

  const workouts = open ? createPortal(
    <div className="client-workouts-root" role="presentation">
      <button
        type="button"
        className="client-workouts-root__backdrop"
        aria-label="Close workouts"
        onPointerDown={backdropDismiss.onPointerDown}
        onPointerUp={backdropDismiss.onPointerUp}
        onClick={backdropDismiss.onClick}
      />
      {showCalendar ? (
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
          </div>
          {pasteSourceKey ? (
            <div className="client-workouts-paste">
              <p className="client-workouts-paste__copy">
                Paste “{formatWorkoutDayHeading(pasteSourceKey)}” — tap a day.
              </p>
              <FastActivateButton
                className="client-workouts-paste__cancel"
                onActivate={() => {
                  setPasteSourceKey(null);
                  if (openedOnDay) onClose();
                }}
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
              const coachMark = coachDayMark(coaching.workoutsByDate.get(cell.dateKey));
              const strength = hasStrengthOnDay(log, cell.dateKey) && !coachMark;
              const trained = cardio || strength;
              const dayTitle = workoutTitleOnDay(log, cell.dateKey);
              const selected = selectedDateKey === cell.dateKey;
              const label = `${formatWorkoutDayAriaLabel(cell.dateKey)}${
                coachMark === "done"
                  ? ", coach workout finished"
                  : coachMark === "open"
                    ? ", workout from your coach"
                    : ""
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
                  {trained || coachMark ? (
                    <span className="client-workouts-cal__marks" aria-hidden>
                      {cardio ? (
                        <span className="client-workouts-cal__mark client-workouts-cal__mark--cardio">
                          <span className="client-workouts-cal__check">
                            <CheckIcon />
                          </span>
                        </span>
                      ) : null}
                      {strength && coachMark !== "done" ? (
                        <span className="client-workouts-cal__mark">
                          <span className="client-workouts-cal__check">
                            <CheckIcon />
                          </span>
                        </span>
                      ) : null}
                      {coachMark ? <CoachDayMark done={coachMark === "done"} /> : null}
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
      ) : null}
      {selectedDateKey && !pasteSourceKey ? (
        <ClientWorkoutDaySheet
          key={selectedDateKey}
          dateKey={selectedDateKey}
          fromCoach={fromCoach}
          onFinish={coachStillOpen ? finishCoachWorkouts : undefined}
          onFinished={handleWorkoutFinished}
          workout={sheetWorkout}
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
            if (onPaste) {
              onPaste(selectedDateKey);
              onClose();
              return;
            }
            setPasteSourceKey(selectedDateKey);
            setSelectedDateKey(null);
          }}
        />
      ) : null}
    </div>,
    document.body
  ) : null;

  return (
    <>
      {workouts}
      {celebrate ? <WorkoutNiceOverlay onDone={dismissNice} /> : null}
      {finishError
        ? createPortal(
            <button
              type="button"
              className="workout-nice-error"
              onClick={() => setFinishError(null)}
            >
              {finishError}
            </button>,
            document.body
          )
        : null}
    </>
  );
}

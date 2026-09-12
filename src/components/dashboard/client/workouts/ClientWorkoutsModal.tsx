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
import { cn } from "@/lib/utils";
import {
  addMonths,
  buildMonthGrid,
  currentWeekProgress,
  currentWeekStreak,
  formatMonthTitle,
  formatWorkoutDayAriaLabel,
  formatWorkoutDayHeading,
  hasWorkoutOnDay,
  isWorkoutDateKey,
  parseLocalDateKey,
  startOfMonth,
  toLocalDateKey,
  workoutTitleOnDay,
  WEEKDAY_LABELS,
} from "@/lib/workouts/client-workout";
import type { ClientWorkoutExercise } from "@/types/client-workout";
import { ClientWorkoutDaySheet } from "./ClientWorkoutDaySheet";
import "@/styles/client-workouts.css";

const LOCK_CLASS = "client-workouts-open";

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
  const { log, setGoalDaysPerWeek, saveDay, removeDay, copyDayTo } =
    useClientWorkouts(userId);
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
    return () => {
      document.body.classList.remove(LOCK_CLASS);
      document.documentElement.classList.remove(LOCK_CLASS);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (selectedDateKeyRef.current) {
        setSelectedDateKey(null);
        return;
      }
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
  const weekLabel = `${progress.trained} / ${progress.goal} this week${
    streak > 0 ? ` · ${streak}-week streak` : ""
  }`;

  function handleDayActivate(dateKey: string) {
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

  function handleSave(exercises: ClientWorkoutExercise[], title: string) {
    if (!selectedDateKey) return false;
    return saveDay(selectedDateKey, exercises, title);
  }

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
              onActivate={onClose}
            >
              <CloseIcon className="h-4 w-4" />
            </FastActivateButton>
          </div>
          <div className="client-workouts-dialog__stats">
            <p className="client-workouts-dialog__stat">
              This week <strong>{progress.trained} / {progress.goal}</strong>
            </p>
            {streak > 0 ? (
              <p className="client-workouts-dialog__stat client-workouts-dialog__stat--streak">
                Streak <strong>{streak}-week</strong>
              </p>
            ) : null}
            <label className="client-workouts-dialog__goal">
              Goal
              <select
                value={log.goalDaysPerWeek}
                onChange={(event) =>
                  setGoalDaysPerWeek(Number(event.target.value))
                }
              >
                {Array.from({ length: 7 }, (_, index) => index + 1).map(
                  (days) => (
                    <option key={days} value={days}>
                      {days} {days === 1 ? "day" : "days"}
                    </option>
                  )
                )}
              </select>
            </label>
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
              const trained = hasWorkoutOnDay(log, cell.dateKey);
              const dayTitle = workoutTitleOnDay(log, cell.dateKey);
              const selected = selectedDateKey === cell.dateKey;
              const label = formatWorkoutDayAriaLabel(cell.dateKey);
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
                      : trained
                        ? dayTitle
                          ? `${label}, ${dayTitle}`
                          : `${label}, workout logged`
                        : label
                  }
                  aria-current={cell.isToday ? "date" : undefined}
                  onActivate={() => handleDayActivate(cell.dateKey)}
                >
                  <span className="client-workouts-cal__num">{cell.day}</span>
                  {trained ? (
                    <span
                      className={cn(
                        "client-workouts-cal__mark",
                        dayTitle && "client-workouts-cal__mark--named"
                      )}
                      aria-hidden
                    >
                      <span className="client-workouts-cal__check">
                        <CheckIcon />
                      </span>
                      {dayTitle ? (
                        <span className="client-workouts-cal__label">{dayTitle}</span>
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

        {selectedDateKey && !pasteSourceKey ? (
          <ClientWorkoutDaySheet
            dateKey={selectedDateKey}
            workout={log.days[selectedDateKey]}
            weekLabel={weekLabel}
            onClose={() => setSelectedDateKey(null)}
            onSave={handleSave}
            onRemove={() => {
              removeDay(selectedDateKey);
              setSelectedDateKey(null);
            }}
            onCopy={() => {
              setPasteSourceKey(selectedDateKey);
              setSelectedDateKey(null);
            }}
          />
        ) : null}
      </div>
    </div>,
    document.body
  );
}

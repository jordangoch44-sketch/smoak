"use client";

import { useEffect, useMemo, useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import { useClientCoaching } from "@/hooks/useClientCoaching";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { isCoachWorkoutInLog } from "@/lib/coaching/coach-workout";
import { cn } from "@/lib/utils";
import {
  addMonths,
  buildMonthGrid,
  currentWeekDayStatuses,
  formatMonthTitle,
  formatWeekGoalCopy,
  formatWorkoutDayAriaLabel,
  formatWorkoutDayHeading,
  hasCardioOnDay,
  hasStrengthOnDay,
  parseLocalDateKey,
  startOfMonth,
  toLocalDateKey,
  workoutTitleOnDay,
  WEEKDAY_LABELS,
  type WeekGoalLine,
} from "@/lib/workouts/client-workout";
import { ClientWorkoutsModal } from "./ClientWorkoutsModal";
import type { ClientWorkoutLog } from "@/types/client-workout";
import "@/styles/client-workouts.css";

function pendingGoalLines(log: ClientWorkoutLog): WeekGoalLine[] {
  const empty = { done: 0, met: false, pct: 0 };
  const lines: WeekGoalLine[] = [
    { id: "workout", label: "Workout", goal: log.goalDaysPerWeek, ...empty },
  ];
  if (log.cardioGoalDaysPerWeek > 0) {
    lines.push({
      id: "cardio",
      label: "Cardio",
      goal: log.cardioGoalDaysPerWeek,
      ...empty,
    });
  }
  return lines;
}

export function ClientWorkoutsEntry({
  userId,
  pasteFrom = null,
  onPasteFromChange,
}: {
  userId: string;
  pasteFrom?: string | null;
  onPasteFromChange?: (dateKey: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openDateKey, setOpenDateKey] = useState<string | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const [month, setMonth] = useState<Date | null>(null);
  const { log, copyDayTo } = useClientWorkouts(userId);
  const { workoutsByDate } = useClientCoaching(userId);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setMonth(startOfMonth(now));
  }, []);

  const weekCopy = useMemo(
    () => (today ? formatWeekGoalCopy(log, today) : null),
    [log, today]
  );
  const weekDays = useMemo(
    () => (today ? currentWeekDayStatuses(log, today) : null),
    [log, today]
  );

  const todayKey = today ? toLocalDateKey(today) : "";
  const cells = useMemo(
    () => (month && todayKey ? buildMonthGrid(month, todayKey) : []),
    [month, todayKey]
  );

  function openDay(dateKey: string) {
    setOpenDateKey(dateKey);
    setOpen(true);
  }

  function closeDay() {
    setOpen(false);
    setOpenDateKey(null);
  }

  function activateDay(dateKey: string) {
    if (!pasteFrom) {
      openDay(dateKey);
      return;
    }
    const pasted = copyDayTo(pasteFrom, dateKey);
    if (!pasted) return;
    onPasteFromChange?.(null);
    setMonth(startOfMonth(parseLocalDateKey(dateKey)));
    openDay(dateKey);
  }

  return (
    <>
      <div className="client-workouts-entry">
        <div className="client-workouts-entry__goals">
          {(weekCopy?.lines ?? pendingGoalLines(log)).map((line) => (
            <div
              key={line.id}
              className={cn(
                "client-workouts-entry__goal-row",
                line.id === "cardio" && "client-workouts-entry__goal-row--cardio"
              )}
            >
              <span className="client-workouts-entry__goal-label">
                {line.label}
              </span>
              <div
                className="client-workouts-entry__track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={line.pct}
                aria-label={`Weekly ${line.label.toLowerCase()} goal`}
              >
                <span
                  className="client-workouts-entry__fill"
                  style={{ width: `${line.pct}%` }}
                />
              </div>
              <span
                className={cn(
                  "client-workouts-entry__goal-count",
                  line.met && "client-workouts-entry__goal-count--done"
                )}
              >
                {line.done}/{line.goal}
              </span>
            </div>
          ))}
        </div>

        <div className="client-workouts-entry__days" role="group" aria-label="This week’s workouts">
          {(weekDays ??
            WEEKDAY_LABELS.map((label, index) => ({
              dateKey: `pending-${index}`,
              label,
              weekday: label,
              isToday: false,
              completed: false,
              strength: false,
              cardio: false,
              isFuture: true,
            }))
          ).map((day) => {
            const pending = day.dateKey.startsWith("pending-");
            const coachPending = (workoutsByDate.get(day.dateKey) ?? []).some(
              (workout) => !isCoachWorkoutInLog(workout, log.days)
            );
            const state = day.completed
              ? day.strength && day.cardio
                ? "workout and cardio logged"
                : day.cardio
                  ? "cardio logged"
                  : "workout logged"
              : day.isFuture
                ? "upcoming"
                : day.isToday
                  ? "not logged yet"
                  : "missed";
            return (
              <FastActivateButton
                key={day.dateKey}
                className={cn(
                  "client-workouts-entry__day",
                  day.isToday && "client-workouts-entry__day--today",
                  day.completed && "client-workouts-entry__day--done",
                  !day.completed && !day.isFuture && "client-workouts-entry__day--empty"
                )}
                disabled={pending}
                aria-label={`${day.weekday}, ${state}${coachPending ? ", workout from your coach" : ""}`}
                aria-current={day.isToday ? "date" : undefined}
                onActivate={() => {
                  if (pending) return;
                  activateDay(day.dateKey);
                }}
              >
                <span className="client-workouts-entry__day-label">{day.label}</span>
                {coachPending ? <span className="client-workouts-cal__coach" aria-hidden /> : null}
                <span className="client-workouts-entry__day-mark" aria-hidden>
                  {day.completed ? (
                    <>
                      {day.cardio ? (
                        <span className="client-workouts-cal__mark client-workouts-cal__mark--cardio">
                          <span className="client-workouts-cal__check">
                            <CheckIcon />
                          </span>
                        </span>
                      ) : null}
                      {day.strength ? (
                        <span className="client-workouts-cal__mark">
                          <span className="client-workouts-cal__check">
                            <CheckIcon />
                          </span>
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="client-workouts-entry__day-slot" />
                  )}
                </span>
              </FastActivateButton>
            );
          })}
        </div>
      </div>

      {month ? (
        <div className="client-workouts-page-cal">
            {pasteFrom ? (
              <div className="client-workouts-paste">
                <p className="client-workouts-paste__copy">
                  Paste “{formatWorkoutDayHeading(pasteFrom)}” — tap a day.
                </p>
                <FastActivateButton
                  className="client-workouts-paste__cancel"
                  onActivate={() => onPasteFromChange?.(null)}
                >
                  Cancel
                </FastActivateButton>
              </div>
            ) : null}
            <div className="client-workouts-month">
              <FastActivateButton
                className="client-workouts-month__nav"
                aria-label="Previous month"
                onActivate={() => setMonth((current) => (current ? addMonths(current, -1) : current))}
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </FastActivateButton>
              <h3 className="client-workouts-month__title">{formatMonthTitle(month)}</h3>
              <FastActivateButton
                className="client-workouts-month__nav"
                aria-label="Next month"
                onActivate={() => setMonth((current) => (current ? addMonths(current, 1) : current))}
              >
                <ChevronRightIcon className="h-5 w-5" />
              </FastActivateButton>
            </div>

            <div className="client-workouts-weekdays" aria-hidden>
              {WEEKDAY_LABELS.map((label, index) => (
                <span key={`cal-${label}-${index}`}>{label}</span>
              ))}
            </div>

            <div className="client-workouts-cal" role="grid" aria-label="Workout calendar">
              {cells.map((cell) => {
                const cardio = hasCardioOnDay(log, cell.dateKey);
                const strength = hasStrengthOnDay(log, cell.dateKey);
                const trained = cardio || strength;
                const dayTitle = workoutTitleOnDay(log, cell.dateKey);
                const coachPending = (workoutsByDate.get(cell.dateKey) ?? []).some(
                  (workout) => !isCoachWorkoutInLog(workout, log.days)
                );
                const label = `${formatWorkoutDayAriaLabel(cell.dateKey)}${
                  coachPending ? ", workout from your coach" : ""
                }`;
                const loggedLabel =
                  cardio && strength
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
                      pasteFrom && "client-workouts-cal__day--paste"
                    )}
                    aria-label={
                      pasteFrom ? `Paste workout onto ${label}` : loggedLabel
                    }
                    aria-current={cell.isToday ? "date" : undefined}
                    onActivate={() => activateDay(cell.dateKey)}
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
      ) : null}

      <ClientWorkoutsModal
        userId={userId}
        open={open}
        initialDateKey={openDateKey}
        onClose={closeDay}
        onPaste={(dateKey) => onPasteFromChange?.(dateKey)}
      />
    </>
  );
}

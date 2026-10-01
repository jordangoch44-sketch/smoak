"use client";

import { useEffect, useMemo, useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import { useClientCoaching } from "@/hooks/useClientCoaching";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { isCoachWorkoutInLog } from "@/lib/coaching/coach-workout";
import { cn } from "@/lib/utils";
import {
  currentWeekDayStatuses,
  formatWeekGoalCopy,
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

export function ClientWorkoutsEntry({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [openDateKey, setOpenDateKey] = useState<string | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const { log } = useClientWorkouts(userId);
  const { workoutsByDate } = useClientCoaching(userId);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const week = useMemo(() => {
    if (!today) return null;
    return {
      copy: formatWeekGoalCopy(log, today),
      days: currentWeekDayStatuses(log, today),
    };
  }, [log, today]);

  function openCalendar(dateKey?: string) {
    setOpenDateKey(dateKey ?? null);
    setOpen(true);
  }

  function closeCalendar() {
    setOpen(false);
    setOpenDateKey(null);
  }

  return (
    <>
      <div className="client-workouts-entry">
        <FastActivateButton
          className="client-workouts-entry__main"
          onActivate={() => openCalendar()}
        >
          <span className="client-workouts-entry__icon" aria-hidden>
            <CalendarIcon className="h-5 w-5" />
          </span>
          <span className="client-workouts-entry__copy">
            <span className="client-workouts-entry__title">Workouts</span>
            <span
              className={cn(
                "client-workouts-entry__status",
                week?.copy.complete && "client-workouts-entry__status--done"
              )}
            >
              {week?.copy.status ?? "Log this week’s training"}
            </span>
          </span>
          <ChevronRightIcon className="client-workouts-entry__chevron h-5 w-5" />
        </FastActivateButton>

        <div className="client-workouts-entry__goals">
          {(week?.copy.lines ?? pendingGoalLines(log)).map((line) => (
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

        <div
          className="client-workouts-entry__days"
          role="group"
          aria-label="This week’s workouts"
        >
          {(week?.days ??
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
                  !day.completed &&
                    !day.isFuture &&
                    "client-workouts-entry__day--empty"
                )}
                disabled={pending}
                aria-label={`${day.weekday}, ${state}${
                  coachPending ? ", workout from your coach" : ""
                }`}
                aria-current={day.isToday ? "date" : undefined}
                onActivate={() => {
                  if (pending) return;
                  openCalendar(day.dateKey);
                }}
              >
                <span className="client-workouts-entry__day-label">
                  {day.label}
                </span>
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

      <ClientWorkoutsModal
        userId={userId}
        open={open}
        initialDateKey={openDateKey}
        onClose={closeCalendar}
      />
    </>
  );
}

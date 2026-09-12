"use client";

import { useEffect, useMemo, useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { cn } from "@/lib/utils";
import {
  currentWeekDayStatuses,
  formatWeekGoalCopy,
  WEEKDAY_LABELS,
} from "@/lib/workouts/client-workout";
import { ClientWorkoutsModal } from "./ClientWorkoutsModal";
import "@/styles/client-workouts.css";

export function ClientWorkoutsEntry({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [openDateKey, setOpenDateKey] = useState<string | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const { log } = useClientWorkouts(userId);

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
            <span className="client-workouts-entry__goal">
              {week?.copy.goal ?? "Goal 4 days / week"}
            </span>
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

        <div
          className="client-workouts-entry__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={week?.copy.pct ?? 0}
          aria-label="Weekly workout goal"
        >
          <span
            className="client-workouts-entry__fill"
            style={{ width: `${week?.copy.pct ?? 0}%` }}
          />
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
              isFuture: true,
            }))
          ).map((day) => {
            const pending = day.dateKey.startsWith("pending-");
            const state = day.completed
              ? "completed"
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
                aria-label={`${day.weekday}, ${state}`}
                aria-current={day.isToday ? "date" : undefined}
                onActivate={() => {
                  if (pending) return;
                  openCalendar(day.dateKey);
                }}
              >
                <span className="client-workouts-entry__day-label">
                  {day.label}
                </span>
                <span className="client-workouts-entry__day-mark" aria-hidden>
                  {day.completed ? (
                    <CheckIcon className="client-workouts-entry__day-check" />
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import {
  BatteryChargingIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import { useClientCoaching } from "@/hooks/useClientCoaching";
import { useClientWorkouts } from "@/hooks/useClientWorkouts";
import { coachDayMark, coachWeekPlan } from "@/lib/coaching/coach-workout";
import { cn } from "@/lib/utils";
import type { CoachingRelationship } from "@/types/coaching";
import {
  addMonths,
  buildMonthGrid,
  formatMonthTitle,
  formatWeekGoalCopy,
  formatWorkoutDayAriaLabel,
  formatWorkoutDayHeading,
  hasCardioOnDay,
  hasRestOnDay,
  hasStrengthOnDay,
  parseLocalDateKey,
  startOfMonth,
  toLocalDateKey,
  workoutTitleOnDay,
  WEEKDAY_LABELS,
  type WeekGoalLine,
} from "@/lib/workouts/client-workout";
import { CoachDayMark } from "./CoachDayMark";
import { ClientWorkoutsModal } from "./ClientWorkoutsModal";
import type { ClientWorkoutLog } from "@/types/client-workout";
import "@/styles/client-workouts.css";

function coachDisplayName(relationship: CoachingRelationship): string {
  return relationship.specialistName.trim() || "Specialist";
}

function SpecialistStatus({
  loaded,
  coaches,
  invites,
  onAccept,
}: {
  loaded: boolean;
  coaches: readonly CoachingRelationship[];
  invites: readonly CoachingRelationship[];
  onAccept: (relationshipId: string) => Promise<boolean>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const waiting = !loaded;
  const open = coaches.length > 0 || invites.length > 0;

  async function accept(relationshipId: string) {
    setBusyId(relationshipId);
    setError(null);
    const ok = await onAccept(relationshipId);
    setBusyId(null);
    if (!ok) setError("Couldn’t accept. Try again.");
  }

  return (
    <div className="client-workouts-entry__goal-row client-workouts-entry__goal-row--specialist">
      <span className="client-workouts-entry__goal-label">Specialist</span>
      <div className="client-workouts-entry__specialist">
        {waiting ? null : !open ? (
          <span className="client-workouts-entry__specialist-empty">N/A</span>
        ) : (
          <>
            {coaches.map((coach) => (
              <span key={coach.id} className="client-workouts-entry__specialist-chip">
                {coachDisplayName(coach)}
              </span>
            ))}
            {invites.map((invite) => {
              const name = coachDisplayName(invite);
              const busy = busyId === invite.id;
              return (
                <FastActivateButton
                  key={invite.id}
                  className="client-workouts-entry__specialist-chip client-workouts-entry__specialist-chip--action"
                  disabled={busy}
                  aria-label={`Accept ${name} request`}
                  onActivate={() => void accept(invite.id)}
                >
                  {busy ? "Accepting…" : `Accept ${name} request`}
                </FastActivateButton>
              );
            })}
          </>
        )}
        {error ? <span className="client-workouts-entry__specialist-error">{error}</span> : null}
      </div>
    </div>
  );
}

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
  const { loaded: coachingLoaded, coaches, invites, workouts, workoutsByDate, respond } =
    useClientCoaching(userId);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setMonth(startOfMonth(now));
  }, []);

  const weekCopy = useMemo(
    () => (today ? formatWeekGoalCopy(log, today) : null),
    [log, today]
  );
  const coachWeek = useMemo(() => {
    if (!today || coaches.length === 0) return null;
    return coachWeekPlan(workouts, today);
  }, [coaches.length, today, workouts]);

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
          <SpecialistStatus
            loaded={coachingLoaded}
            coaches={coaches}
            invites={invites}
            onAccept={(relationshipId) => respond(relationshipId, true)}
          />
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
          {coachWeek && (coachWeek.open.length > 0 || coachWeek.completed) ? (
            <div className="client-workouts-entry__goal-row client-workouts-entry__goal-row--week">
              <span className="client-workouts-entry__goal-label">This week</span>
              <div className="client-workouts-entry__week">
                {coachWeek.completed ? (
                  <p className="client-workouts-entry__week-done">
                    <span className="client-workouts-entry__week-check" aria-hidden>
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    Completed
                  </p>
                ) : (
                  coachWeek.open.map((workout) => {
                    const title = workout.title.trim() || "Workout";
                    const when = formatWorkoutDayHeading(workout.dateKey);
                    return (
                      <FastActivateButton
                        key={workout.id}
                        className="client-workouts-entry__week-chip"
                        aria-label={`${title}, ${formatWorkoutDayAriaLabel(workout.dateKey)}`}
                        onActivate={() => activateDay(workout.dateKey)}
                      >
                        <span className="client-workouts-entry__week-title">{title}</span>
                        <span className="client-workouts-entry__week-date">· {when}</span>
                      </FastActivateButton>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
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
                const coachMark = coachDayMark(workoutsByDate.get(cell.dateKey));
                const strength = hasStrengthOnDay(log, cell.dateKey) && !coachMark;
                const rest = hasRestOnDay(log, cell.dateKey) && !cardio && !strength && !coachMark;
                const trained = cardio || strength || rest;
                const dayTitle = workoutTitleOnDay(log, cell.dateKey);
                const label = `${formatWorkoutDayAriaLabel(cell.dateKey)}${
                  coachMark === "done"
                    ? ", coach workout finished"
                    : coachMark === "open"
                      ? ", workout from your coach"
                      : ""
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
                        : rest
                          ? `${label}, rest day`
                          : label;
                return (
                  <FastActivateButton
                    key={cell.dateKey}
                    className={cn(
                      "client-workouts-cal__day",
                      !cell.inMonth && "client-workouts-cal__day--muted",
                      cell.isToday && "client-workouts-cal__day--today",
                      pasteFrom ? "client-workouts-cal__day--paste" : undefined
                    )}
                    aria-label={
                      pasteFrom ? `Paste workout onto ${label}` : loggedLabel
                    }
                    aria-current={cell.isToday ? "date" : undefined}
                    onActivate={() => activateDay(cell.dateKey)}
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
                        {rest ? (
                          <span className="client-workouts-cal__mark client-workouts-cal__mark--rest">
                            <BatteryChargingIcon />
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

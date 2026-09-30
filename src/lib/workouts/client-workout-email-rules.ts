import type { ClientWorkoutLog } from "@/types/client-workout";
import {
  addDays,
  currentWeekProgress,
  currentWeekStreak,
  isWorkoutDateKey,
  startOfWeekSunday,
  toLocalDateKey,
  type WeekGoalProgress,
} from "@/lib/workouts/client-workout";
import {
  buildWeekOverview,
  type WeekOverviewStat,
} from "@/lib/workouts/client-workout-overview";

export type WorkoutEmailKind = "streak_at_risk" | "streak_milestone" | "weekly_recap";

export const STREAK_MILESTONES = [2, 4, 8, 12, 26, 52] as const;

/** Used until a device saves its zone onto the log. */
export const DEFAULT_WORKOUT_EMAIL_TIME_ZONE = "America/Los_Angeles";

/** Milestones only go out in waking hours. */
const MILESTONE_HOURS = { from: 8, to: 20 } as const;
/** Friday 5pm through Saturday noon. */
const AT_RISK_FRIDAY_HOUR = 17;
const AT_RISK_SATURDAY_UNTIL_HOUR = 12;
/** Sunday from 9am. */
const RECAP_SUNDAY_HOUR = 9;
/** Recaps only go to clients who logged something in the last few weeks. */
const RECAP_ACTIVE_WEEKS = 4;

export type DueWorkoutEmail =
  | { kind: "streak_milestone"; periodKey: string; streak: number }
  | {
      kind: "streak_at_risk";
      periodKey: string;
      streak: number;
      workoutsLeft: number;
      cardioLeft: number;
      daysLeft: number;
    }
  | {
      kind: "weekly_recap";
      periodKey: string;
      rangeLabel: string;
      streak: number;
      workout: WeekGoalProgress;
      cardio: WeekGoalProgress | null;
      stats: WeekOverviewStat[];
      highlight: string | null;
    };

/**
 * The wall-clock time in `timeZone`, as a Date whose local fields read that time.
 * Lets the week helpers (which use local getters) run on a UTC server.
 */
export function wallClockIn(timeZone: string, now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value ?? 0);
  return new Date(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
}

function loggedBetween(log: ClientWorkoutLog, fromKey: string, toKey: string): boolean {
  return Object.keys(log.days).some(
    (key) => isWorkoutDateKey(key) && key >= fromKey && key <= toKey
  );
}

function milestoneEmail(log: ClientWorkoutLog, localNow: Date): DueWorkoutEmail | null {
  const hour = localNow.getHours();
  if (hour < MILESTONE_HOURS.from || hour > MILESTONE_HOURS.to) return null;
  if (!currentWeekProgress(log, localNow).met) return null;
  const streak = currentWeekStreak(log, localNow);
  if (!(STREAK_MILESTONES as readonly number[]).includes(streak)) return null;
  return {
    kind: "streak_milestone",
    periodKey: toLocalDateKey(startOfWeekSunday(localNow)),
    streak,
  };
}

function atRiskEmail(log: ClientWorkoutLog, localNow: Date): DueWorkoutEmail | null {
  const day = localNow.getDay();
  const hour = localNow.getHours();
  let daysLeft = 0;
  if (day === 5 && hour >= AT_RISK_FRIDAY_HOUR) daysLeft = 2;
  else if (day === 6 && hour < AT_RISK_SATURDAY_UNTIL_HOUR) daysLeft = 1;
  if (daysLeft === 0) return null;

  const progress = currentWeekProgress(log, localNow);
  if (progress.met) return null;
  const streak = currentWeekStreak(log, localNow);
  if (streak < 1) return null;

  const workoutsLeft = Math.max(0, progress.workout.goal - progress.workout.done);
  const cardioLeft = progress.cardio
    ? Math.max(0, progress.cardio.goal - progress.cardio.done)
    : 0;
  /* Strength and cardio can share a day, so the bigger gap is what matters. */
  if (Math.max(workoutsLeft, cardioLeft) > daysLeft) return null;

  return {
    kind: "streak_at_risk",
    periodKey: toLocalDateKey(startOfWeekSunday(localNow)),
    streak,
    workoutsLeft,
    cardioLeft,
    daysLeft,
  };
}

function recapEmail(log: ClientWorkoutLog, localNow: Date): DueWorkoutEmail | null {
  if (localNow.getDay() !== 0 || localNow.getHours() < RECAP_SUNDAY_HOUR) return null;

  const lastWeekStart = addDays(startOfWeekSunday(localNow), -7);
  const lastWeekEnd = addDays(lastWeekStart, 6);
  const activeFrom = addDays(lastWeekStart, -7 * (RECAP_ACTIVE_WEEKS - 1));
  if (!loggedBetween(log, toLocalDateKey(activeFrom), toLocalDateKey(lastWeekEnd))) {
    return null;
  }

  const overview = buildWeekOverview(log, lastWeekEnd);
  const progress = currentWeekProgress(log, lastWeekEnd);
  return {
    kind: "weekly_recap",
    periodKey: toLocalDateKey(lastWeekStart),
    rangeLabel: overview.rangeLabel,
    /* The week is over, so a missed goal ends the streak. */
    streak: progress.met ? currentWeekStreak(log, lastWeekEnd) : 0,
    workout: progress.workout,
    cardio: progress.cardio,
    stats: overview.stats,
    highlight: overview.highlight,
  };
}

/** Emails this client should get right now. The caller dedupes on (kind, periodKey). */
export function dueWorkoutEmails(log: ClientWorkoutLog, localNow: Date): DueWorkoutEmail[] {
  return [milestoneEmail(log, localNow), atRiskEmail(log, localNow), recapEmail(log, localNow)].filter(
    (email): email is DueWorkoutEmail => email !== null
  );
}

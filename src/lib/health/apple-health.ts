import { isNativeShell } from "@/lib/native-billing";
import {
  addDays,
  startOfMonth,
  startOfWeekSunday,
  toLocalDateKey,
} from "@/lib/workouts/client-workout";

export type AppleHealthSource = "watch" | "iphone" | "other";

/** One completed HealthKit workout. Active calories are omitted when Apple has none. */
export interface AppleHealthWorkout {
  id: string;
  activity: string;
  activityLabel: string;
  start: string;
  end: string;
  durationSeconds: number;
  activeCalories: number | null;
  source: AppleHealthSource;
}

export interface AppleHealthWeekDay {
  dateKey: string;
  label: string;
  workouts: AppleHealthWorkout[];
}

export interface AppleHealthWeek {
  workoutCount: number;
  durationSeconds: number;
  /** Set only when every workout in the week reported active calories. */
  activeCalories: number | null;
  days: AppleHealthWeekDay[];
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const OVERLAP_RATIO = 0.5;

type CapacitorPlatformWindow = Window & {
  Capacitor?: { getPlatform?: () => string };
};

/** True inside the iPhone app. The website and any other shell stay false. */
export function isIosApp(): boolean {
  if (typeof window === "undefined") return false;
  if (!isNativeShell()) return false;
  const platform = (window as CapacitorPlatformWindow).Capacitor?.getPlatform?.();
  return platform !== "android";
}

/** The native shell can attach after the first paint, especially after a reload. */
export function subscribeIosApp(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  const timers = [0, 50, 250, 800].map((delay) => window.setTimeout(onChange, delay));
  return () => {
    observer.disconnect();
    timers.forEach((timer) => window.clearTimeout(timer));
  };
}

export function sanitizeAppleHealthWorkout(value: unknown): AppleHealthWorkout | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const start = typeof raw.start === "string" ? raw.start : "";
  const end = typeof raw.end === "string" ? raw.end : "";
  if (!id || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))) return null;
  const durationSeconds =
    typeof raw.durationSeconds === "number" &&
    Number.isFinite(raw.durationSeconds) &&
    raw.durationSeconds >= 0
      ? raw.durationSeconds
      : 0;
  const activeCalories =
    typeof raw.activeCalories === "number" &&
    Number.isFinite(raw.activeCalories) &&
    raw.activeCalories > 0
      ? raw.activeCalories
      : null;
  const activity = typeof raw.activity === "string" && raw.activity.trim() ? raw.activity.trim() : "other";
  const label =
    typeof raw.activityLabel === "string" && raw.activityLabel.trim()
      ? raw.activityLabel.trim().slice(0, 40)
      : "Workout";
  const source: AppleHealthSource =
    raw.source === "watch" || raw.source === "iphone" || raw.source === "other" ? raw.source : "other";
  return {
    id,
    activity,
    activityLabel: label,
    start,
    end,
    durationSeconds,
    activeCalories,
    source,
  };
}

function interval(workout: AppleHealthWorkout): { start: number; end: number } | null {
  const start = Date.parse(workout.start);
  const end = Date.parse(workout.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return { start, end };
}

function sameSession(left: AppleHealthWorkout, right: AppleHealthWorkout): boolean {
  if (left.activity !== right.activity) return false;
  const a = interval(left);
  const b = interval(right);
  if (!a || !b) return false;
  const overlap = Math.min(a.end, b.end) - Math.max(a.start, b.start);
  if (overlap <= 0) return false;
  const shorter = Math.min(a.end - a.start, b.end - b.start);
  return overlap / shorter > OVERLAP_RATIO;
}

function sourceRank(source: AppleHealthSource): number {
  if (source === "watch") return 2;
  if (source === "iphone") return 1;
  return 0;
}

function preferWorkout(candidate: AppleHealthWorkout, current: AppleHealthWorkout): boolean {
  const candidateRank = sourceRank(candidate.source);
  const currentRank = sourceRank(current.source);
  if (candidateRank !== currentRank) return candidateRank > currentRank;
  return candidate.durationSeconds > current.durationSeconds;
}

/**
 * One row per HealthKit id. When two workouts of the same kind overlap,
 * keep the Apple Watch sample, otherwise the longer one.
 */
export function dedupeAppleHealthWorkouts(
  workouts: readonly AppleHealthWorkout[]
): AppleHealthWorkout[] {
  const byId = new Map<string, AppleHealthWorkout>();
  for (const workout of workouts) byId.set(workout.id, workout);
  const sorted = [...byId.values()].sort(
    (a, b) => a.start.localeCompare(b.start) || b.durationSeconds - a.durationSeconds
  );
  const kept: AppleHealthWorkout[] = [];
  for (const workout of sorted) {
    const clash = kept.findIndex((existing) => sameSession(existing, workout));
    if (clash === -1) {
      kept.push(workout);
      continue;
    }
    if (preferWorkout(workout, kept[clash]!)) kept[clash] = workout;
  }
  return kept;
}

export function appleHealthDateKey(iso: string): string | null {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return toLocalDateKey(date);
}

export function appleHealthWorkoutsOnDate(
  workouts: readonly AppleHealthWorkout[],
  dateKey: string
): AppleHealthWorkout[] {
  return workouts
    .filter((workout) => appleHealthDateKey(workout.start) === dateKey)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Sunday–Saturday, matching the training journal. Days without a workout are omitted. */
export function buildAppleHealthWeek(
  workouts: readonly AppleHealthWorkout[],
  today: Date
): AppleHealthWeek {
  const weekStart = startOfWeekSunday(today);
  const days: AppleHealthWeekDay[] = [];
  let workoutCount = 0;
  let durationSeconds = 0;
  let calories = 0;
  let caloriesComplete = true;

  for (let index = 0; index < 7; index += 1) {
    const date = addDays(weekStart, index);
    const dateKey = toLocalDateKey(date);
    const onDay = appleHealthWorkoutsOnDate(workouts, dateKey);
    if (onDay.length === 0) continue;
    days.push({
      dateKey,
      label: WEEKDAY[date.getDay()] ?? "",
      workouts: onDay,
    });
    for (const workout of onDay) {
      workoutCount += 1;
      durationSeconds += workout.durationSeconds;
      if (workout.activeCalories == null) caloriesComplete = false;
      else calories += workout.activeCalories;
    }
  }

  return {
    workoutCount,
    durationSeconds,
    activeCalories: workoutCount > 0 && caloriesComplete ? calories : null,
    days,
  };
}

/** Visible month grid, widened to the current week when that week falls outside it. */
export function appleHealthQueryRange(month: Date, today: Date): { start: Date; end: Date } {
  const gridStart = startOfWeekSunday(startOfMonth(month));
  const gridEnd = addDays(gridStart, 41);
  const weekStart = startOfWeekSunday(today);
  const weekEnd = addDays(weekStart, 6);
  const start = gridStart < weekStart ? gridStart : weekStart;
  const end = gridEnd > weekEnd ? gridEnd : weekEnd;
  return {
    start: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
    end: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999),
  };
}

export function formatHealthDuration(seconds: number): string {
  const minutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  if (hours <= 0) return `${minutes} min`;
  if (remain === 0) return hours === 1 ? "1 hr" : `${hours} hr`;
  return `${hours} hr ${remain} min`;
}

export function formatHealthCalories(kcal: number): string {
  return `${Math.round(kcal).toLocaleString("en-US")} kcal`;
}

export function formatAppleHealthSummary(week: AppleHealthWeek): string {
  const workouts = week.workoutCount === 1 ? "1 workout" : `${week.workoutCount} workouts`;
  const parts = [formatHealthDuration(week.durationSeconds), workouts];
  if (week.activeCalories != null) parts.unshift(formatHealthCalories(week.activeCalories));
  return parts.join(" · ");
}

export function formatAppleHealthWorkoutDetail(workout: AppleHealthWorkout): string {
  if (workout.activeCalories != null) return formatHealthCalories(workout.activeCalories);
  return formatHealthDuration(workout.durationSeconds);
}

export function formatAppleHealthDayLine(workout: AppleHealthWorkout): string {
  const source = workout.source === "watch" ? "Apple Watch" : "Apple Health";
  const parts = [source, workout.activityLabel, formatHealthDuration(workout.durationSeconds)];
  if (workout.activeCalories != null) parts.push(formatHealthCalories(workout.activeCalories));
  return parts.join(" · ");
}

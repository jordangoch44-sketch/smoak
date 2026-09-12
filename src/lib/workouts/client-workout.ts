import type {
  ClientWorkoutDay,
  ClientWorkoutExercise,
  ClientWorkoutLog,
} from "@/types/client-workout";

export const DEFAULT_GOAL_DAYS_PER_WEEK = 4;
export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const WORKOUT_TITLE_PRESETS = ["Push", "Pull", "Legs", "Rest"] as const;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_STREAK_WEEKS = 520;
const MAX_TITLE_LENGTH = 24;

export function emptyClientWorkoutLog(): ClientWorkoutLog {
  return { goalDaysPerWeek: DEFAULT_GOAL_DAYS_PER_WEEK, days: {} };
}

export function createWorkoutExerciseId(): string {
  return `ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function blankWorkoutExercise(): ClientWorkoutExercise {
  return { id: createWorkoutExerciseId(), name: "", sets: "", reps: "" };
}

export function isWorkoutDateKey(value: string): boolean {
  return DATE_KEY.test(value);
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function addDays(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

/** Apple Calendar (US): weeks start Sunday. */
export function startOfWeekSunday(date: Date): Date {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return addDays(local, -local.getDay());
}

export function clampGoalDaysPerWeek(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_GOAL_DAYS_PER_WEEK;
  return Math.min(7, Math.max(1, Math.round(value)));
}

export function sanitizeWorkoutTitle(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH);
}

export function hasExercisesOnDay(
  log: ClientWorkoutLog,
  dateKey: string
): boolean {
  return (log.days[dateKey]?.exercises.length ?? 0) > 0;
}

export function hasWorkoutOnDay(
  log: ClientWorkoutLog,
  dateKey: string
): boolean {
  const day = log.days[dateKey];
  if (!day) return false;
  return day.exercises.length > 0 || Boolean(day.title.trim());
}

export function workoutTitleOnDay(
  log: ClientWorkoutLog,
  dateKey: string
): string {
  return log.days[dateKey]?.title.trim() ?? "";
}

export function cloneWorkoutExercises(
  exercises: readonly ClientWorkoutExercise[]
): ClientWorkoutExercise[] {
  return exercises
    .map((exercise) => ({
      id: createWorkoutExerciseId(),
      name: exercise.name.trim(),
      sets: exercise.sets.trim(),
      reps: exercise.reps.trim(),
    }))
    .filter((exercise) => exercise.name.length > 0);
}

export function sanitizeWorkoutExercises(
  exercises: readonly ClientWorkoutExercise[]
): ClientWorkoutExercise[] {
  return exercises
    .map((exercise) => ({
      id: exercise.id.trim() || createWorkoutExerciseId(),
      name: exercise.name.trim(),
      sets: exercise.sets.trim(),
      reps: exercise.reps.trim(),
    }))
    .filter((exercise) => exercise.name.length > 0);
}

export function sanitizeClientWorkoutLog(value: unknown): ClientWorkoutLog {
  const fallback = emptyClientWorkoutLog();
  if (!value || typeof value !== "object") return fallback;

  const raw = value as Partial<ClientWorkoutLog>;
  const days: Record<string, ClientWorkoutDay> = {};
  if (raw.days && typeof raw.days === "object") {
    for (const [dateKey, day] of Object.entries(raw.days)) {
      if (!isWorkoutDateKey(dateKey) || !day || typeof day !== "object") continue;
      const exercises = sanitizeWorkoutExercises(
        Array.isArray(day.exercises) ? day.exercises : []
      );
      if (exercises.length === 0 && !sanitizeWorkoutTitle(day.title)) continue;
      days[dateKey] = {
        date: dateKey,
        title: sanitizeWorkoutTitle(day.title),
        exercises,
      };
    }
  }

  return {
    goalDaysPerWeek: clampGoalDaysPerWeek(Number(raw.goalDaysPerWeek)),
    days,
  };
}

export interface CalendarDayCell {
  dateKey: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

export function buildMonthGrid(month: Date, todayKey: string): CalendarDayCell[] {
  const monthStart = startOfMonth(month);
  const gridStart = startOfWeekSunday(monthStart);
  const cells: CalendarDayCell[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index);
    const dateKey = toLocalDateKey(date);
    cells.push({
      dateKey,
      day: date.getDate(),
      inMonth: date.getMonth() === month.getMonth(),
      isToday: dateKey === todayKey,
    });
  }
  return cells;
}

export function trainedDateKeysInWeek(
  log: ClientWorkoutLog,
  weekStart: Date
): string[] {
  const keys: string[] = [];
  for (let index = 0; index < 7; index += 1) {
    const dateKey = toLocalDateKey(addDays(weekStart, index));
    if (hasExercisesOnDay(log, dateKey)) keys.push(dateKey);
  }
  return keys;
}

export function weekMetGoal(log: ClientWorkoutLog, weekStart: Date): boolean {
  return trainedDateKeysInWeek(log, weekStart).length >= log.goalDaysPerWeek;
}

export function currentWeekProgress(
  log: ClientWorkoutLog,
  today: Date = new Date()
): { trained: number; goal: number } {
  const trained = trainedDateKeysInWeek(log, startOfWeekSunday(today)).length;
  return { trained, goal: log.goalDaysPerWeek };
}

export interface WeekDayStatus {
  dateKey: string;
  label: string;
  weekday: string;
  isToday: boolean;
  completed: boolean;
  isFuture: boolean;
}

export function currentWeekDayStatuses(
  log: ClientWorkoutLog,
  today: Date = new Date()
): WeekDayStatus[] {
  const weekStart = startOfWeekSunday(today);
  const todayKey = toLocalDateKey(today);
  return WEEKDAY_LABELS.map((label, index) => {
    const date = addDays(weekStart, index);
    const dateKey = toLocalDateKey(date);
    return {
      dateKey,
      label,
      weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
      isToday: dateKey === todayKey,
      completed: hasExercisesOnDay(log, dateKey),
      isFuture: dateKey > todayKey,
    };
  });
}

export function formatWeekGoalCopy(
  log: ClientWorkoutLog,
  today: Date = new Date()
): { goal: string; status: string; complete: boolean; pct: number } {
  const { trained, goal } = currentWeekProgress(log, today);
  const complete = trained >= goal;
  return {
    goal: `Goal ${goal} ${goal === 1 ? "day" : "days"} / week`,
    status: complete
      ? "Week complete"
      : `${trained} of ${goal} done this week`,
    complete,
    pct: goal <= 0 ? 0 : Math.min(100, Math.round((trained / goal) * 100)),
  };
}

export function currentWeekStreak(
  log: ClientWorkoutLog,
  today: Date = new Date()
): number {
  let week = startOfWeekSunday(today);
  if (!weekMetGoal(log, week)) {
    week = addDays(week, -7);
  }

  let streak = 0;
  for (let index = 0; index < MAX_STREAK_WEEKS; index += 1) {
    if (!weekMetGoal(log, week)) break;
    streak += 1;
    week = addDays(week, -7);
  }
  return streak;
}

export function formatMonthTitle(month: Date): string {
  return month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatWorkoutDayHeading(dateKey: string): string {
  return parseLocalDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatWorkoutDayAriaLabel(dateKey: string): string {
  return parseLocalDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatExerciseRange(exercise: ClientWorkoutExercise): string {
  const sets = exercise.sets.trim();
  const reps = exercise.reps.trim();
  if (sets && reps) return `${sets} × ${reps}`;
  return sets || reps;
}

export function formatExerciseLine(exercise: ClientWorkoutExercise): string {
  const name = exercise.name.trim();
  const range = formatExerciseRange(exercise);
  return range ? `${name} — ${range}` : name;
}

export function formatWorkoutShareText(day: ClientWorkoutDay): string {
  const heading = formatWorkoutDayHeading(day.date);
  const title = day.title.trim();
  const lines = day.exercises
    .filter((exercise) => exercise.name.trim())
    .map(formatExerciseLine);
  return [title ? `${heading} — ${title}` : heading, ...lines].join("\n");
}

export async function shareOrCopyWorkoutText(
  text: string
): Promise<"shared" | "copied"> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return "copied";
  }

  throw new Error("Share unavailable");
}

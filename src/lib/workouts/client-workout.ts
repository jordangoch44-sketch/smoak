import type {
  ClientWorkoutCardio,
  ClientWorkoutDay,
  ClientWorkoutExercise,
  ClientWorkoutLog,
  ClientWorkoutSetLog,
} from "@/types/client-workout";

export const DEFAULT_GOAL_DAYS_PER_WEEK = 4;
export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_STREAK_WEEKS = 520;
const MAX_TITLE_LENGTH = 24;
const MAX_CARDIO_TYPE_LENGTH = 32;
const MAX_CARDIO_DURATION_LENGTH = 16;
export const MAX_WORKOUT_SETS = 10;

export function emptyClientWorkoutLog(): ClientWorkoutLog {
  return { goalDaysPerWeek: DEFAULT_GOAL_DAYS_PER_WEEK, days: {} };
}

export function createWorkoutExerciseId(): string {
  return `ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function blankWorkoutExercise(): ClientWorkoutExercise {
  return { id: createWorkoutExerciseId(), name: "", sets: "", reps: "" };
}

export function sanitizeWorkoutCount(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function sanitizeWorkoutWeight(value: unknown): string {
  if (typeof value !== "string") return "";
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  const fraction = rest.join("").replace(/\D/g, "").slice(0, 1);
  const digits = (whole ?? "").replace(/\D/g, "");
  const body = fraction ? `${digits}.${fraction}` : digits;
  return body.slice(0, 6);
}

/** Positive set count, capped so the phone flow stays short. */
export function parseWorkoutSetCount(value: string): number | null {
  const digits = sanitizeWorkoutCount(value, 2);
  if (!digits) return null;
  const count = Number(digits);
  if (!Number.isInteger(count) || count < 1) return null;
  return Math.min(MAX_WORKOUT_SETS, count);
}

export function sanitizeWorkoutSetLogs(
  value: unknown
): ClientWorkoutSetLog[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const logs = value.slice(0, MAX_WORKOUT_SETS).map((item) => {
    if (!item || typeof item !== "object") return { reps: "", weight: "" };
    const raw = item as Partial<ClientWorkoutSetLog>;
    return {
      reps: sanitizeWorkoutCount(raw.reps, 4),
      weight: sanitizeWorkoutWeight(raw.weight),
    };
  });
  if (!logs.some((log) => log.reps || log.weight)) return undefined;
  return logs;
}

export function sanitizeWorkoutExercise(
  exercise: ClientWorkoutExercise
): ClientWorkoutExercise | null {
  const name = exercise.name.trim();
  if (!name) return null;
  const setLogs = sanitizeWorkoutSetLogs(exercise.setLogs);
  const sets = setLogs
    ? String(setLogs.length)
    : exercise.sets.replace(/\s+/g, " ").trim().slice(0, 8);
  return {
    id: exercise.id.trim() || createWorkoutExerciseId(),
    name,
    sets,
    reps: setLogs ? "" : exercise.reps.replace(/\s+/g, " ").trim().slice(0, 16),
    ...(setLogs ? { setLogs } : {}),
    ...(exercise.completed === true ? { completed: true } : {}),
  };
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

export function emptyWorkoutCardio(): ClientWorkoutCardio {
  return { type: "", duration: "" };
}

export function sanitizeCardioField(
  value: unknown,
  maxLength: number
): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function sanitizeWorkoutCardio(
  value: unknown
): ClientWorkoutCardio | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<ClientWorkoutCardio>;
  const type = sanitizeCardioField(raw.type, MAX_CARDIO_TYPE_LENGTH);
  const duration = sanitizeCardioField(
    raw.duration,
    MAX_CARDIO_DURATION_LENGTH
  );
  if (!type && !duration) return undefined;
  return {
    type,
    duration,
    ...(raw.completed === true ? { completed: true } : {}),
  };
}

export function formatCardioLine(cardio: ClientWorkoutCardio): string {
  const type = cardio.type.trim();
  const duration = cardio.duration.trim();
  if (type && duration) return `${type} · ${duration}`;
  return type || duration;
}

export function hasExercisesOnDay(
  log: ClientWorkoutLog,
  dateKey: string
): boolean {
  return (log.days[dateKey]?.exercises.length ?? 0) > 0;
}

export function hasCardioOnDay(
  log: ClientWorkoutLog,
  dateKey: string
): boolean {
  const day = log.days[dateKey];
  return Boolean(day?.cardio?.type.trim() || day?.cardio?.duration.trim());
}

export function hasStrengthOnDay(
  log: ClientWorkoutLog,
  dateKey: string
): boolean {
  const day = log.days[dateKey];
  if (!day) return false;
  return day.exercises.length > 0 || Boolean(day.title.trim());
}

export function hasWorkoutOnDay(
  log: ClientWorkoutLog,
  dateKey: string
): boolean {
  return hasStrengthOnDay(log, dateKey) || hasCardioOnDay(log, dateKey);
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
  return exercises.flatMap((exercise) => {
    const cleaned = sanitizeWorkoutExercise({ ...exercise, completed: undefined });
    if (!cleaned) return [];
    return [{ ...cleaned, id: createWorkoutExerciseId() }];
  });
}

export function sanitizeWorkoutExercises(
  exercises: readonly ClientWorkoutExercise[]
): ClientWorkoutExercise[] {
  return exercises.flatMap((exercise) => {
    const cleaned = sanitizeWorkoutExercise(exercise);
    return cleaned ? [cleaned] : [];
  });
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
      const title = sanitizeWorkoutTitle(day.title);
      const cardio = sanitizeWorkoutCardio(
        "cardio" in day ? day.cardio : undefined
      );
      if (exercises.length === 0 && !title && !cardio) continue;
      days[dateKey] = {
        date: dateKey,
        title,
        exercises,
        ...(cardio ? { cardio } : {}),
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
    if (hasWorkoutOnDay(log, dateKey)) keys.push(dateKey);
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
      completed: hasWorkoutOnDay(log, dateKey),
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
    goal: `Workout goal ${goal} ${goal === 1 ? "day" : "days"} a week`,
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

export function formatSetCount(count: number): string {
  return count === 1 ? "1 set" : `${count} sets`;
}

export function formatSetLogLine(index: number, log: ClientWorkoutSetLog): string {
  const reps = log.reps.trim();
  const weight = log.weight.trim();
  if (reps && weight) return `${index} · ${reps} × ${weight} lb`;
  if (reps) return `${index} · ${reps} reps`;
  return `${index} · ${weight} lb`;
}

function formatUniformSets(count: number, log: ClientWorkoutSetLog): string {
  const reps = log.reps.trim();
  const weight = log.weight.trim();
  if (reps && weight) return `${count} × ${reps} × ${weight} lb`;
  if (reps) return `${count} × ${reps}`;
  return `${count} × ${weight} lb`;
}

/** Lines under an exercise name. One compact line when every set matches. */
export function formatExerciseDetailLines(exercise: ClientWorkoutExercise): string[] {
  const logs = exercise.setLogs?.map((log) => ({
    reps: log.reps.trim(),
    weight: log.weight.trim(),
  }));
  const sets = exercise.sets.trim();
  const reps = exercise.reps.trim();

  if (logs && logs.length > 0) {
    const filled = logs.filter((log) => log.reps || log.weight);
    if (filled.length === 0) return [formatSetCount(logs.length)];
    const first = filled[0]!;
    const uniform =
      filled.length === logs.length &&
      filled.every((log) => log.reps === first.reps && log.weight === first.weight);
    if (uniform) return [formatUniformSets(logs.length, first)];
    const lines = [formatSetCount(logs.length)];
    logs.forEach((log, index) => {
      if (!log.reps && !log.weight) return;
      lines.push(formatSetLogLine(index + 1, log));
    });
    return lines;
  }

  if (sets && reps) return [`${sets} × ${reps}`];
  if (/^\d+$/.test(sets)) return [formatSetCount(Number(sets))];
  if (sets || reps) return [sets || reps];
  return [];
}

export function formatExerciseRange(exercise: ClientWorkoutExercise): string {
  return formatExerciseDetailLines(exercise).join(", ");
}

export function formatExerciseLine(exercise: ClientWorkoutExercise): string {
  const name = exercise.name.trim();
  const lines = formatExerciseDetailLines(exercise);
  if (lines.length === 0) return name;
  if (lines.length === 1) return `${name} — ${lines[0]}`;
  return [name, ...lines].join("\n");
}

export function formatWorkoutShareText(day: ClientWorkoutDay): string {
  const heading = formatWorkoutDayHeading(day.date);
  const title = day.title.trim();
  const cardio = day.cardio ? formatCardioLine(day.cardio) : "";
  const lines = day.exercises
    .filter((exercise) => exercise.name.trim())
    .map(formatExerciseLine);
  return [
    title ? `${heading} — ${title}` : heading,
    cardio ? `Cardio: ${cardio}` : "",
    ...lines,
  ]
    .filter(Boolean)
    .join("\n");
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

import type {
  ClientWorkoutCardio,
  ClientWorkoutDay,
  ClientWorkoutExercise,
  ClientWorkoutLog,
  ClientWorkoutSetLog,
} from "@/types/client-workout";
import { officialExerciseName } from "@/data/workout-exercise-library";
import { customExerciseFields } from "@/lib/workouts/custom-exercises";

export const DEFAULT_GOAL_DAYS_PER_WEEK = 4;
export const DEFAULT_CARDIO_GOAL_DAYS_PER_WEEK = 3;
export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_STREAK_WEEKS = 520;
const MAX_TITLE_LENGTH = 24;
const MAX_CARDIO_TYPE_LENGTH = 32;
const MAX_CARDIO_DURATION_LENGTH = 16;
export const MAX_WORKOUT_SETS = 10;

export function emptyClientWorkoutLog(): ClientWorkoutLog {
  return {
    goalDaysPerWeek: DEFAULT_GOAL_DAYS_PER_WEEK,
    cardioGoalDaysPerWeek: DEFAULT_CARDIO_GOAL_DAYS_PER_WEEK,
    days: {},
    bodyWeights: {},
  };
}

const MIN_BODY_WEIGHT_LB = 40;
const MAX_BODY_WEIGHT_LB = 1000;

/** Pounds rounded to 0.1, or null when outside a plausible body weight. */
export function sanitizeBodyWeight(value: unknown): number | null {
  const weight = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(weight)) return null;
  if (weight < MIN_BODY_WEIGHT_LB || weight > MAX_BODY_WEIGHT_LB) return null;
  return Math.round(weight * 10) / 10;
}

export function sanitizeBodyWeights(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const weights: Record<string, number> = {};
  for (const [dateKey, raw] of Object.entries(value)) {
    if (!isWorkoutDateKey(dateKey)) continue;
    const weight = sanitizeBodyWeight(raw);
    if (weight !== null) weights[dateKey] = weight;
  }
  return weights;
}

/** A time zone the runtime can format with, or undefined. */
export function sanitizeTimeZone(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const zone = value.trim();
  if (!zone || zone.length > 64) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return undefined;
  }
}

export function formatBodyWeight(weight: number): string {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
}

export function createWorkoutExerciseId(): string {
  return `ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function blankWorkoutExercise(): ClientWorkoutExercise {
  return { id: createWorkoutExerciseId(), name: "", sets: "", reps: "" };
}

function blankSetLog(): ClientWorkoutSetLog {
  return { reps: "", weight: "" };
}

/** One empty set row, ready for a name. */
export function freshExerciseBlock(): ClientWorkoutExercise {
  return {
    id: createWorkoutExerciseId(),
    name: "",
    sets: "1",
    reps: "",
    setLogs: [blankSetLog()],
  };
}

/** A past exercise the set table can copy weights and reps from. Newest first. */
export interface ExerciseSetMemory {
  dateKey: string;
  name: string;
  sets: string;
  reps: string;
  setLogs?: ClientWorkoutSetLog[];
}

/** Earlier days, newest first, flattened to one row per exercise. */
export function exerciseMemoryBefore(
  entries: readonly {
    dateKey: string;
    exercises: readonly ClientWorkoutExercise[];
  }[],
  beforeDateKey: string
): ExerciseSetMemory[] {
  return entries
    .filter((entry) => entry.dateKey < beforeDateKey)
    .sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0))
    .flatMap((entry) =>
      entry.exercises.map((exercise) => ({
        dateKey: entry.dateKey,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        setLogs: exercise.setLogs,
      }))
    );
}

/** Replace the set rows and mark the exercise done only when every set is checked. */
export function exerciseWithSetLogs(
  exercise: ClientWorkoutExercise,
  setLogs: readonly ClientWorkoutSetLog[]
): ClientWorkoutExercise {
  const logs = (setLogs.length > 0 ? setLogs : [blankSetLog()])
    .slice(0, MAX_WORKOUT_SETS)
    .map((log) => {
      const next: ClientWorkoutSetLog = {
        reps: log.reps,
        weight: log.weight,
      };
      if (log.completed === true) next.completed = true;
      return next;
    });
  return {
    ...exercise,
    sets: String(logs.length),
    reps: "",
    setLogs: logs,
    completed: logs.every((log) => log.completed === true),
  };
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

export const EXERCISE_NOTE_MAX_LENGTH = 160;

/** One line. Empty after trim is dropped when the exercise is saved. */
export function sanitizeExerciseNote(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").slice(0, EXERCISE_NOTE_MAX_LENGTH);
}

/**
 * Weight and reps from the last time this exercise was actually logged.
 * `prior` is newest first. Blank sessions are skipped.
 */
export function previousSetsForExercise(
  prior: readonly ExerciseSetMemory[],
  name: string
): ClientWorkoutSetLog[] {
  const key = name.trim().toLowerCase();
  if (!key) return [];
  const match = prior.find((item) => {
    if (item.name.trim().toLowerCase() !== key) return false;
    if (item.setLogs?.some((set) => set.weight?.trim() || set.reps?.trim())) return true;
    return Boolean(item.reps.trim()) && !(item.setLogs && item.setLogs.length > 0);
  });
  if (!match) return [];
  if (match.setLogs && match.setLogs.length > 0) return match.setLogs;
  const reps = match.reps.trim();
  const count = parseWorkoutSetCount(match.sets) ?? 1;
  return Array.from({ length: count }, () => ({ reps, weight: "" }));
}

/** "135×10", or a dash when that set wasn't logged. */
export function formatPreviousSet(log: ClientWorkoutSetLog | undefined): string {
  const weight = log?.weight?.trim() ?? "";
  const reps = log?.reps?.trim() ?? "";
  if (weight && reps) return `${weight}×${reps}`;
  if (weight || reps) return weight || reps;
  return "–";
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
    const log: ClientWorkoutSetLog = {
      reps: sanitizeWorkoutCount(raw.reps, 4),
      weight: sanitizeWorkoutWeight(raw.weight),
    };
    if (raw.completed === true) log.completed = true;
    return log;
  });
  return logs;
}

export function sanitizeWorkoutExercise(
  exercise: ClientWorkoutExercise
): ClientWorkoutExercise | null {
  const name = officialExerciseName(exercise.name);
  if (!name) return null;
  const setLogs = sanitizeWorkoutSetLogs(exercise.setLogs);
  const sets = setLogs
    ? String(setLogs.length)
    : exercise.sets.replace(/\s+/g, " ").trim().slice(0, 8);
  const supersetId = sanitizeSupersetId(exercise.supersetId);
  const note = sanitizeExerciseNote(exercise.note).trim();
  return {
    id: exercise.id.trim() || createWorkoutExerciseId(),
    name,
    sets,
    reps: setLogs ? "" : exercise.reps.replace(/\s+/g, " ").trim().slice(0, 16),
    ...(setLogs ? { setLogs } : {}),
    ...(note ? { note } : {}),
    ...(exercise.completed === true ? { completed: true } : {}),
    ...(supersetId ? { supersetId } : {}),
    ...customExerciseFields(exercise),
  };
}

function sanitizeSupersetId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim();
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return undefined;
  return id;
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

/** 0 turns the cardio goal off. Logs saved before cardio goals get the default. */
export function clampCardioGoalDaysPerWeek(value: unknown): number {
  if (value === undefined || value === null) {
    return DEFAULT_CARDIO_GOAL_DAYS_PER_WEEK;
  }
  const count = Number(value);
  if (!Number.isFinite(count)) return DEFAULT_CARDIO_GOAL_DAYS_PER_WEEK;
  return Math.min(7, Math.max(0, Math.round(count)));
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

export function hasRestOnDay(log: ClientWorkoutLog, dateKey: string): boolean {
  return log.days[dateKey]?.rest === true;
}

export function hasStrengthOnDay(
  log: ClientWorkoutLog,
  dateKey: string
): boolean {
  const day = log.days[dateKey];
  if (!day || day.rest === true) return false;
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
      const rest =
        day.rest === true && exercises.length === 0 && !title && !cardio;
      if (exercises.length === 0 && !title && !cardio && !rest) continue;
      days[dateKey] = {
        date: dateKey,
        title,
        exercises,
        ...(cardio ? { cardio } : {}),
        ...(rest ? { rest: true } : {}),
      };
    }
  }

  const timeZone = sanitizeTimeZone(raw.timeZone);
  return {
    goalDaysPerWeek: clampGoalDaysPerWeek(Number(raw.goalDaysPerWeek)),
    cardioGoalDaysPerWeek: clampCardioGoalDaysPerWeek(raw.cardioGoalDaysPerWeek),
    days,
    bodyWeights: sanitizeBodyWeights(raw.bodyWeights),
    ...(timeZone ? { timeZone } : {}),
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

function countDaysInWeek(
  log: ClientWorkoutLog,
  weekStart: Date,
  matches: (log: ClientWorkoutLog, dateKey: string) => boolean
): number {
  let count = 0;
  for (let index = 0; index < 7; index += 1) {
    if (matches(log, toLocalDateKey(addDays(weekStart, index)))) count += 1;
  }
  return count;
}

export interface WeekGoalProgress {
  done: number;
  goal: number;
  met: boolean;
}

export interface WeekProgress {
  workout: WeekGoalProgress;
  /** Null when the cardio goal is off. */
  cardio: WeekGoalProgress | null;
  /** Every active goal is met. */
  met: boolean;
}

function weekProgress(log: ClientWorkoutLog, weekStart: Date): WeekProgress {
  const workoutDone = countDaysInWeek(log, weekStart, hasStrengthOnDay);
  const workout = {
    done: workoutDone,
    goal: log.goalDaysPerWeek,
    met: workoutDone >= log.goalDaysPerWeek,
  };
  const cardioGoal = log.cardioGoalDaysPerWeek;
  const cardioDone =
    cardioGoal > 0 ? countDaysInWeek(log, weekStart, hasCardioOnDay) : 0;
  const cardio =
    cardioGoal > 0
      ? { done: cardioDone, goal: cardioGoal, met: cardioDone >= cardioGoal }
      : null;
  return { workout, cardio, met: workout.met && (cardio?.met ?? true) };
}

export function weekMetGoal(log: ClientWorkoutLog, weekStart: Date): boolean {
  return weekProgress(log, weekStart).met;
}

export function currentWeekProgress(
  log: ClientWorkoutLog,
  today: Date = new Date()
): WeekProgress {
  return weekProgress(log, startOfWeekSunday(today));
}

export interface WeekDayStatus {
  dateKey: string;
  label: string;
  weekday: string;
  isToday: boolean;
  completed: boolean;
  strength: boolean;
  cardio: boolean;
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
    const strength = hasStrengthOnDay(log, dateKey);
    const cardio = hasCardioOnDay(log, dateKey);
    return {
      dateKey,
      label,
      weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
      isToday: dateKey === todayKey,
      completed: strength || cardio,
      strength,
      cardio,
      isFuture: dateKey > todayKey,
    };
  });
}

function formatDaysCount(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

export function formatGoalOptionLabel(days: number): string {
  return days === 0 ? "Off" : `${formatDaysCount(days)} a week`;
}

export interface WeekGoalLine {
  id: "workout" | "cardio";
  label: string;
  done: number;
  goal: number;
  met: boolean;
  pct: number;
}

export function formatWeekGoalCopy(
  log: ClientWorkoutLog,
  today: Date = new Date()
): { status: string; complete: boolean; lines: WeekGoalLine[] } {
  const progress = currentWeekProgress(log, today);
  const line = (
    id: WeekGoalLine["id"],
    label: string,
    goal: WeekGoalProgress
  ): WeekGoalLine => ({
    id,
    label,
    done: goal.done,
    goal: goal.goal,
    met: goal.met,
    pct:
      goal.goal <= 0
        ? 0
        : Math.min(100, Math.round((goal.done / goal.goal) * 100)),
  });
  const lines = [line("workout", "Workout", progress.workout)];
  if (progress.cardio) lines.push(line("cardio", "Cardio", progress.cardio));
  return {
    status: progress.met
      ? "Week complete"
      : lines
          .map((item) => `${item.done} of ${item.goal} ${item.label.toLowerCase()}`)
          .join(" · "),
    complete: progress.met,
    lines,
  };
}

/** One line for the day sheet header, e.g. "2 / 4 workouts · 1 / 3 cardio". */
export function formatWeekProgressLabel(
  progress: WeekProgress,
  streak: number
): string {
  const parts = [`${progress.workout.done} / ${progress.workout.goal} workouts`];
  if (progress.cardio) {
    parts.push(`${progress.cardio.done} / ${progress.cardio.goal} cardio`);
  }
  if (streak > 0) parts.push(`${streak}-week streak`);
  return parts.join(" · ");
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

/** Longest run of goal-met weeks, from the first logged day through this week. */
export function bestWeekStreak(
  log: ClientWorkoutLog,
  today: Date = new Date()
): number {
  const firstKey = Object.keys(log.days)
    .filter(isWorkoutDateKey)
    .sort()[0];
  if (!firstKey) return 0;

  const lastWeek = startOfWeekSunday(today).getTime();
  let week = startOfWeekSunday(parseLocalDateKey(firstKey));
  let best = 0;
  let run = 0;
  for (
    let index = 0;
    index < MAX_STREAK_WEEKS && week.getTime() <= lastWeek;
    index += 1
  ) {
    run = weekMetGoal(log, week) ? run + 1 : 0;
    best = Math.max(best, run);
    week = addDays(week, 7);
  }
  return best;
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

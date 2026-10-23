import type {
  ClientWorkoutCardio,
  ClientWorkoutDay,
  ClientWorkoutExercise,
  ClientWorkoutLog,
  ClientWorkoutSetLog,
  WorkoutEffort,
  WorkoutLoad,
} from "@/types/client-workout";
import {
  catalogExerciseBodyParts,
  catalogExerciseEquipment,
  catalogExerciseIsAssistedMachine,
  catalogExerciseUsesAddedWeight,
} from "@/data/exercise-db-catalog";
import { storedExerciseName } from "@/data/exercise-display";
import { customExerciseFields } from "@/lib/workouts/custom-exercises";
import { equipmentForExercise } from "@/lib/workouts/exercise-catalog";

export const DEFAULT_GOAL_DAYS_PER_WEEK = 4;
export const DEFAULT_CARDIO_GOAL_DAYS_PER_WEEK = 3;
export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_STREAK_WEEKS = 520;
const MAX_TITLE_LENGTH = 24;
export const MAX_CARDIO_TYPE_LENGTH = 80;
export const MAX_CARDIO_DURATION_LENGTH = 48;
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

/** Digits and one decimal place. A trailing dot stays so "7." can become "7.5". */
export function sanitizeWorkoutWeight(value: unknown): string {
  if (typeof value !== "string") return "";
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned.slice(0, 6);
  const whole = cleaned.slice(0, dot).replace(/\D/g, "");
  const fraction = cleaned.slice(dot + 1).replace(/\D/g, "").slice(0, 1);
  return `${whole}.${fraction}`.slice(0, 6);
}

/** Machine assistance is stored below zero. "40" and "-40" both become "-40". */
export function signAssistanceWeight(value: unknown): string {
  const magnitude = sanitizeWorkoutWeight(value);
  if (!magnitude || magnitude === ".") return "";
  return `-${magnitude}`;
}

/** Assisted pull-up and dip machines. The stack helps, so the load is negative. */
export function exerciseAssistsWithMachine(
  exercise: Pick<ClientWorkoutExercise, "name">
): boolean {
  const name = exercise.name.trim().toLowerCase();
  if (!name || name.includes("band")) return false;
  if (catalogExerciseIsAssistedMachine(name)) return true;
  if (!/\bassisted\b/.test(name)) return false;
  return (
    name.includes("machine") ||
    /\bpull[-\s]?ups?\b/.test(name) ||
    /\bchin[-\s]?ups?\b/.test(name) ||
    /\bdips?\b/.test(name)
  );
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

const RUN_NAME = /\b(runs?|running|jogs?|jogging|sprints?|sprinting|treadmill)\b/;

/**
 * A run, jog, sprint, or treadmill from the library, or a custom name that says so.
 * Strength moves that only mention a sprint stay on pounds and reps.
 */
export function exerciseUsesDistance(name: string): boolean {
  const key = name.trim().toLowerCase();
  if (!RUN_NAME.test(key)) return false;
  const parts = catalogExerciseBodyParts(key);
  return parts.length === 0 || parts.includes("cardio");
}

export function exerciseEffort(
  exercise: Pick<ClientWorkoutExercise, "name" | "effort">
): WorkoutEffort {
  if (exercise.effort === "reps" || exercise.effort === "distance") return exercise.effort;
  return exerciseUsesDistance(exercise.name) ? "distance" : "reps";
}

/** Null when this exercise has no load column. A run uses miles per hour. */
export function exerciseLoad(
  exercise: Pick<ClientWorkoutExercise, "name" | "equipment" | "exerciseType" | "load">
): WorkoutLoad | null {
  if (
    exercise.load === "lb" ||
    exercise.load === "kg" ||
    exercise.load === "bodyweight" ||
    exercise.load === "speed"
  ) {
    return exercise.load;
  }
  if (exerciseUsesDistance(exercise.name)) return "speed";
  return exerciseLogsWeight(exercise) ? "lb" : null;
}

export function nextExerciseEffort(effort: WorkoutEffort): WorkoutEffort {
  return effort === "reps" ? "distance" : "reps";
}

/** `speed` keeps miles per hour in the cycle for a run. */
export function nextExerciseLoad(load: WorkoutLoad, speed = false): WorkoutLoad {
  if (load === "speed") return "lb";
  if (load === "lb") return "kg";
  if (load === "kg") return "bodyweight";
  return speed ? "speed" : "lb";
}

/** "135 lbs", "6.5 mph", or a dash when that set wasn't logged. */
export function formatPreviousSet(
  log: ClientWorkoutSetLog | undefined,
  load: WorkoutLoad | null = "lb",
  effort: WorkoutEffort = "reps"
): string {
  const weight = log?.weight?.trim() ?? "";
  const reps = log?.reps?.trim() ?? "";
  if (load === "speed") {
    if (weight) return `${weight} mph`;
    if (reps) return `${reps} mi`;
    return "–";
  }
  if (weight && load !== "bodyweight") {
    return load === "kg" ? `${weight} kg` : `${weight} lbs`;
  }
  if (reps) return effort === "distance" ? `${reps} mi` : reps;
  return "–";
}

/** Added load still gets a pounds field. A plain bodyweight movement does not. */
function nameCarriesLoad(name: string): boolean {
  return /\b(weighted|assisted)\b/.test(name) || name.includes("medicine ball");
}

function unloadedBodyweightName(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n || nameCarriesLoad(n)) return false;
  if (n.includes("bodyweight") || n.includes("body weight")) return true;
  const catalog = catalogExerciseEquipment(n);
  if (catalog === "bodyweight") return true;
  if (catalog) return false;
  return equipmentForExercise(n) === "bodyweight";
}

/** False for a bodyweight exercise, so the set table has reps and no pounds. */
export function exerciseLogsWeight(
  exercise: Pick<ClientWorkoutExercise, "name" | "equipment" | "exerciseType">
): boolean {
  const name = exercise.name.trim().toLowerCase();
  if (name && (nameCarriesLoad(name) || catalogExerciseUsesAddedWeight(exercise.name))) return true;
  if (exercise.exerciseType === "bodyweight" || exercise.equipment === "bodyweight") return false;
  if (exercise.exerciseType === "strength" || exercise.equipment) return true;
  return !unloadedBodyweightName(exercise.name);
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
  value: unknown,
  effort: WorkoutEffort = "reps"
): ClientWorkoutSetLog[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const logs = value.slice(0, MAX_WORKOUT_SETS).map((item) => {
    if (!item || typeof item !== "object") return { reps: "", weight: "" };
    const raw = item as Partial<ClientWorkoutSetLog>;
    const log: ClientWorkoutSetLog = {
      reps:
        effort === "distance"
          ? sanitizeWorkoutWeight(raw.reps)
          : sanitizeWorkoutCount(raw.reps, 4),
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
  const name = storedExerciseName(exercise.name);
  if (!name) return null;
  const resolvedEffort =
    exercise.effort === "reps" || exercise.effort === "distance"
      ? exercise.effort
      : exerciseUsesDistance(name)
        ? "distance"
        : "reps";
  const setLogs = sanitizeWorkoutSetLogs(exercise.setLogs, resolvedEffort);
  const signedLogs =
    setLogs && exerciseAssistsWithMachine({ name })
      ? setLogs.map((log) => ({ ...log, weight: signAssistanceWeight(log.weight) }))
      : setLogs;
  const sets = setLogs
    ? String(setLogs.length)
    : exercise.sets.replace(/\s+/g, " ").trim().slice(0, 8);
  const supersetId = sanitizeSupersetId(exercise.supersetId);
  const note = sanitizeExerciseNote(exercise.note).trim();
  const effort = exercise.effort === "reps" || exercise.effort === "distance" ? exercise.effort : undefined;
  const load =
    exercise.load === "lb" ||
    exercise.load === "kg" ||
    exercise.load === "bodyweight" ||
    exercise.load === "speed"
      ? exercise.load
      : undefined;
  const reps = setLogs
    ? ""
    : resolvedEffort === "distance"
      ? sanitizeWorkoutWeight(exercise.reps).replace(/\.$/, "")
      : exercise.reps.replace(/\s+/g, " ").trim().slice(0, 16);
  return {
    id: exercise.id.trim() || createWorkoutExerciseId(),
    name,
    sets,
    reps,
    ...(signedLogs ? { setLogs: signedLogs } : {}),
    ...(note ? { note } : {}),
    ...(exercise.completed === true ? { completed: true } : {}),
    ...(supersetId ? { supersetId } : {}),
    ...(effort ? { effort } : {}),
    ...(load ? { load } : {}),
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

/** First word of the activity. The day chip stays short; the full line lives on the workout. */
export function cardioChipLabel(cardio: ClientWorkoutCardio): string {
  const source = cardio.type.trim() || cardio.duration.trim();
  return source.split(/\s+/)[0] ?? "";
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
  return day.exercises.some((exercise) => exercise.name.trim());
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

export interface WorkoutClock {
  startedAt?: string | null;
  endedAt?: string | null;
}

export function sanitizeWorkoutInstant(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return undefined;
  return new Date(time).toISOString();
}

/** `m:ss` until an hour, then `h:mm:ss`. */
export function formatWorkoutDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  return `${minutes}:${ss}`;
}

export interface WorkoutLivePosition {
  exerciseName: string;
  setNumber: number;
  setCount: number;
  setLabel: string;
  /** Current set, ready for the lock screen. "—" when that number is blank. */
  weightLabel: string;
  repsLabel: string;
  setsLabel: string;
  /** Custom photo, when the exercise has one. Library stills are resolved separately. */
  imageUrl: string;
}

export interface ActiveWorkoutLive {
  startedAt: string;
  exercises: readonly ClientWorkoutExercise[];
}

function exerciseSetsFinished(exercise: ClientWorkoutExercise): boolean {
  const logs = exercise.setLogs;
  if (logs && logs.length > 0) return logs.every((set) => set.completed === true);
  return exercise.completed === true;
}

/** The exercise and set still ahead. Finished exercises are skipped. */
export function currentWorkoutPosition(
  exercises: readonly ClientWorkoutExercise[]
): WorkoutLivePosition | null {
  const named = exercises.filter((exercise) => exercise.name.trim());
  if (named.length === 0) return null;
  const current = named.find((exercise) => !exerciseSetsFinished(exercise)) ?? named[named.length - 1]!;
  const logs = current.setLogs ?? [];
  const parsed = parseWorkoutSetCount(current.sets);
  const setCount = Math.max(logs.length, parsed ?? 0, 1);
  const openIndex = logs.findIndex((set) => set.completed !== true);
  const setNumber = logs.length === 0 ? 1 : openIndex === -1 ? logs.length : openIndex + 1;
  const exerciseName = current.name.trim().replace(/\s+/g, " ").slice(0, 48);
  const openLog = logs[setNumber - 1];
  const rawWeight = openLog?.weight?.trim() ?? "";
  const weight = exerciseAssistsWithMachine(current) ? signAssistanceWeight(rawWeight) : rawWeight;
  const reps = openLog?.reps?.trim() || current.reps.trim();
  const load = exerciseLoad(current);
  const effort = exerciseEffort(current);
  return {
    exerciseName,
    setNumber,
    setCount,
    setLabel: `Set ${setNumber} of ${setCount}`,
    weightLabel:
      load === "speed"
        ? weight.trim()
          ? `${weight.trim()} mph`
          : "—"
        : load === "lb" || load === "kg"
          ? liveWeightLabel(weight, load)
          : "—",
    repsLabel:
      effort === "distance" ? (reps.trim() ? `${reps.trim()} mi` : "—") : liveRepsLabel(reps),
    setsLabel: liveSetsLabel(setCount),
    imageUrl: current.imageUrl?.trim() ?? "",
  };
}

export function liveWeightLabel(weight: string, load: "lb" | "kg" = "lb"): string {
  const trimmed = weight.trim();
  if (!trimmed) return "—";
  if (load === "kg") return /kg/i.test(trimmed) ? trimmed : `${trimmed} kg`;
  return /lb/i.test(trimmed) ? trimmed : `${trimmed} lb`;
}

export function liveRepsLabel(reps: string): string {
  const trimmed = reps.trim();
  if (!trimmed) return "—";
  return /rep/i.test(trimmed) ? trimmed : `${trimmed} reps`;
}

export function liveSetsLabel(count: number): string {
  const sets = Math.max(1, Math.floor(count));
  return sets === 1 ? "1 set" : `${sets} sets`;
}

/** The newest workout whose clock is still running. */
export function activeWorkoutForLiveActivity(log: ClientWorkoutLog): ActiveWorkoutLive | null {
  let best: ActiveWorkoutLive | null = null;
  for (const day of Object.values(log.days)) {
    if (!day.startedAt || day.endedAt) continue;
    if (!best || day.startedAt > best.startedAt) {
      best = { startedAt: day.startedAt, exercises: day.exercises };
    }
  }
  return best;
}

export function workoutClockFields(
  previous: { startedAt?: string; endedAt?: string } | undefined,
  clock?: WorkoutClock | null
): { startedAt?: string; endedAt?: string } {
  if (clock === null) return {};
  const startedAt = sanitizeWorkoutInstant(clock?.startedAt ?? previous?.startedAt);
  const endedAt = sanitizeWorkoutInstant(clock?.endedAt ?? previous?.endedAt);
  if (!startedAt) return {};
  if (!endedAt || Date.parse(endedAt) < Date.parse(startedAt)) return { startedAt };
  return { startedAt, endedAt };
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
      if (exercises.length === 0 && !cardio && !rest) continue;
      const clock = rest ? {} : workoutClockFields(day);
      days[dateKey] = {
        date: dateKey,
        title,
        exercises,
        ...(cardio ? { cardio } : {}),
        ...(rest ? { rest: true } : {}),
        ...clock,
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

function measuredSet(
  log: Pick<ClientWorkoutSetLog, "reps" | "weight">,
  effort: WorkoutEffort,
  load: WorkoutLoad | null
): { reps: string; weight: string } {
  const reps = log.reps.trim();
  const weight = log.weight.trim();
  return {
    reps: reps ? (effort === "distance" ? `${reps} mi` : reps) : "",
    weight:
      weight && load !== "bodyweight" && load !== null
        ? `${weight} ${load === "kg" ? "kg" : load === "speed" ? "mph" : "lb"}`
        : "",
  };
}

export function formatSetLogLine(
  index: number,
  log: ClientWorkoutSetLog,
  exercise?: Pick<ClientWorkoutExercise, "name" | "effort" | "equipment" | "exerciseType" | "load">
): string {
  const effort = exercise ? exerciseEffort(exercise) : "reps";
  const load = exercise ? exerciseLoad(exercise) : "lb";
  const measured = measuredSet(log, effort, load);
  if (measured.reps && measured.weight) return `${index} · ${measured.reps} × ${measured.weight}`;
  if (measured.reps) {
    return effort === "distance" ? `${index} · ${measured.reps}` : `${index} · ${log.reps.trim()} reps`;
  }
  return `${index} · ${measured.weight}`;
}

function formatUniformSets(
  count: number,
  log: ClientWorkoutSetLog,
  exercise: Pick<ClientWorkoutExercise, "name" | "effort" | "equipment" | "exerciseType" | "load">
): string {
  const measured = measuredSet(log, exerciseEffort(exercise), exerciseLoad(exercise));
  if (measured.reps && measured.weight) return `${count} × ${measured.reps} × ${measured.weight}`;
  if (measured.reps) return `${count} × ${measured.reps}`;
  return `${count} × ${measured.weight}`;
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
    if (uniform) return [formatUniformSets(logs.length, first, exercise)];
    const lines = [formatSetCount(logs.length)];
    logs.forEach((log, index) => {
      if (!log.reps && !log.weight) return;
      lines.push(formatSetLogLine(index + 1, log, exercise));
    });
    return lines;
  }

  if (sets && reps) {
    return [exerciseEffort(exercise) === "distance" ? `${sets} × ${reps} mi` : `${sets} × ${reps}`];
  }
  if (/^\d+$/.test(sets)) return [formatSetCount(Number(sets))];
  if (sets || reps) return [sets || reps];
  return [];
}

export function formatExerciseRange(exercise: ClientWorkoutExercise): string {
  return formatExerciseDetailLines(exercise).join(", ");
}

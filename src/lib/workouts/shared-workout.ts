import { storedExerciseName } from "@/data/exercise-display";
import { absoluteUrl } from "@/lib/seo/site-url";
import {
  createWorkoutExerciseId,
  exerciseUsesDistance,
  hasCardioOnDay,
  hasRestOnDay,
  hasStrengthOnDay,
  MAX_WORKOUT_SETS,
  parseWorkoutSetCount,
  sanitizeWorkoutTitle,
} from "@/lib/workouts/client-workout";
import type { ClientWorkoutDay, ClientWorkoutExercise, ClientWorkoutLog } from "@/types/client-workout";

/** Title, exercise, sets, and reps. Logged weight never leaves the phone. */
export interface SharedWorkoutExercise {
  name: string;
  sets: string;
  reps: string;
  supersetId?: string;
}

export interface SharedWorkoutPlan {
  title: string;
  exercises: SharedWorkoutExercise[];
}

export interface SharedWorkoutPreview extends SharedWorkoutPlan {
  senderName: string;
}

const TOKEN = /^[0-9a-f]{32}$/i;
const REPS = /[^0-9A-Za-z ./_-]/g;

export const SMOAC_APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() ||
  "https://apps.apple.com/us/search?term=SMOAC";

export function isSharedWorkoutToken(value: string): boolean {
  return TOKEN.test(value.trim());
}

export function sharedWorkoutPath(token: string): string {
  return `/w/${token.trim().toLowerCase()}`;
}

export function sharedWorkoutUrl(token: string): string {
  return absoluteUrl(sharedWorkoutPath(token));
}

/** Opens the installed app when the text link was viewed in the browser. */
export function sharedWorkoutAppUrl(token: string): string {
  return `smoac://w/${token.trim().toLowerCase()}`;
}

export function sharedWorkoutTitle(title: string): string {
  return title.trim() || "Workout";
}

export function sharedExerciseCountLabel(count: number): string {
  return count === 1 ? "1 exercise" : `${count} exercises`;
}

export function sharedWorkoutText(title: string, url: string): string {
  return `${sharedWorkoutTitle(title)} is on SMOAC\n${url}`;
}

export function formatSharedExerciseLine(exercise: SharedWorkoutExercise): string {
  const count = Number(exercise.sets) || 1;
  const sets = count === 1 ? "1 set" : `${count} sets`;
  const reps = exercise.reps.trim();
  if (!reps) return sets;
  if (exerciseUsesDistance(exercise.name)) return `${sets} · ${reps} mi`;
  return `${sets} · ${reps} reps`;
}

/** Pull the plan off a day. Set weights and notes are dropped. */
export function sharedWorkoutPlan(day: Pick<ClientWorkoutDay, "title" | "exercises">): SharedWorkoutPlan {
  const exercises = day.exercises.flatMap((exercise) => {
    const planned = planExercise(exercise);
    return planned ? [planned] : [];
  });
  return {
    title: sanitizeWorkoutTitle(day.title),
    exercises: exercises.slice(0, 40),
  };
}

export function sanitizeSharedExercises(value: unknown): SharedWorkoutExercise[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const planned = planExercise({
      id: "shared",
      name: typeof raw.name === "string" ? raw.name : "",
      sets: typeof raw.sets === "string" ? raw.sets : "",
      reps: typeof raw.reps === "string" ? raw.reps : "",
      supersetId: typeof raw.supersetId === "string" ? raw.supersetId : undefined,
    });
    return planned ? [planned] : [];
  }).slice(0, 40);
}

/** A fresh copy the recipient can log. Reps stay. Weights do not. */
export function exercisesFromSharedPlan(
  exercises: readonly SharedWorkoutExercise[]
): ClientWorkoutExercise[] {
  return exercises.map((exercise) => ({
    id: createWorkoutExerciseId(),
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    ...(exercise.supersetId ? { supersetId: exercise.supersetId } : {}),
  }));
}

export function sharedWorkoutDayTaken(
  log: ClientWorkoutLog,
  dateKey: string,
  coachWorkouts = 0
): boolean {
  if (coachWorkouts > 0) return true;
  if (hasStrengthOnDay(log, dateKey) || hasCardioOnDay(log, dateKey) || hasRestOnDay(log, dateKey)) {
    return true;
  }
  return Boolean(log.days[dateKey]?.title.trim());
}

export function sharedWorkoutTokenFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "smoac:") {
      const path = `/${parsed.hostname}${parsed.pathname}`.replace(/\/+/g, "/");
      return tokenFromPath(path);
    }
    return tokenFromPath(parsed.pathname);
  } catch {
    return null;
  }
}

function tokenFromPath(pathname: string): string | null {
  const match = /^\/w\/([0-9a-f]{32})\/?$/i.exec(pathname);
  return match?.[1]?.toLowerCase() ?? null;
}

function planExercise(exercise: ClientWorkoutExercise): SharedWorkoutExercise | null {
  const name = storedExerciseName(exercise.name).replace(/\s+/g, " ").trim().slice(0, 80);
  if (!name) return null;
  const fromLogs = exercise.setLogs?.length ?? 0;
  const parsed = parseWorkoutSetCount(exercise.sets);
  const count = Math.min(MAX_WORKOUT_SETS, Math.max(fromLogs, parsed ?? 0, 1));
  const reps = planReps(exercise);
  const supersetId = sanitizeSupersetId(exercise.supersetId);
  return {
    name,
    sets: String(count),
    reps,
    ...(supersetId ? { supersetId } : {}),
  };
}

function planReps(exercise: ClientWorkoutExercise): string {
  const direct = cleanReps(exercise.reps);
  if (direct) return direct;
  const logged = (exercise.setLogs ?? []).map((log) => cleanReps(log.reps)).filter(Boolean);
  if (logged.length === 0) return "";
  const first = logged[0] ?? "";
  return logged.every((reps) => reps === first) ? first : "";
}

function cleanReps(value: string): string {
  return value.replace(REPS, "").replace(/\s+/g, " ").trim().slice(0, 16);
}

function sanitizeSupersetId(value: string | undefined): string | undefined {
  if (!value || !/^[A-Za-z0-9_-]{1,40}$/.test(value)) return undefined;
  return value;
}

import { CLIENT_WORKOUTS_STORAGE_PREFIX } from "@/lib/dev-storage-keys";
import {
  cloneWorkoutExercises,
  emptyClientWorkoutLog,
  sanitizeClientWorkoutLog,
  sanitizeWorkoutExercises,
  sanitizeWorkoutTitle,
  clampGoalDaysPerWeek,
} from "@/lib/workouts/client-workout";
import type {
  ClientWorkoutExercise,
  ClientWorkoutLog,
} from "@/types/client-workout";

const EMPTY_LOG: ClientWorkoutLog = emptyClientWorkoutLog();
const listeners = new Set<() => void>();

let cachedUserId: string | null = null;
let cachedLog: ClientWorkoutLog = EMPTY_LOG;

function storageKey(userId: string): string {
  return `${CLIENT_WORKOUTS_STORAGE_PREFIX}${userId}`;
}

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function readLog(userId: string): ClientWorkoutLog {
  if (typeof window === "undefined") return EMPTY_LOG;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return emptyClientWorkoutLog();
    return sanitizeClientWorkoutLog(JSON.parse(raw) as unknown);
  } catch {
    return emptyClientWorkoutLog();
  }
}

function persistLog(userId: string, log: ClientWorkoutLog): void {
  cachedUserId = userId;
  cachedLog = log;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(log));
    } catch {
      /* quota / private mode */
    }
  }
  emitChange();
}

export function subscribeClientWorkouts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getClientWorkoutLog(userId: string | null): ClientWorkoutLog {
  if (!userId) return EMPTY_LOG;
  if (cachedUserId === userId) return cachedLog;
  const loaded = readLog(userId);
  cachedUserId = userId;
  cachedLog = loaded;
  return cachedLog;
}

export function getClientWorkoutLogServerSnapshot(): ClientWorkoutLog {
  return EMPTY_LOG;
}

export function setClientWorkoutGoalDays(
  userId: string,
  goalDaysPerWeek: number
): void {
  const current = getClientWorkoutLog(userId);
  persistLog(userId, {
    ...current,
    goalDaysPerWeek: clampGoalDaysPerWeek(goalDaysPerWeek),
  });
}

export function saveClientWorkoutDay(
  userId: string,
  dateKey: string,
  exercises: readonly ClientWorkoutExercise[],
  title = ""
): boolean {
  const nextExercises = sanitizeWorkoutExercises(exercises);
  const nextTitle = sanitizeWorkoutTitle(title);
  if (nextExercises.length === 0 && !nextTitle) return false;
  const current = getClientWorkoutLog(userId);
  persistLog(userId, {
    ...current,
    days: {
      ...current.days,
      [dateKey]: {
        date: dateKey,
        title: nextTitle,
        exercises: nextExercises,
      },
    },
  });
  return true;
}

export function removeClientWorkoutDay(userId: string, dateKey: string): void {
  const current = getClientWorkoutLog(userId);
  if (!current.days[dateKey]) return;
  const nextDays = { ...current.days };
  delete nextDays[dateKey];
  persistLog(userId, { ...current, days: nextDays });
}

export function copyClientWorkoutDay(
  userId: string,
  fromDateKey: string,
  toDateKey: string
): boolean {
  if (fromDateKey === toDateKey) return false;
  const current = getClientWorkoutLog(userId);
  const source = current.days[fromDateKey];
  if (!source) return false;
  const exercises = cloneWorkoutExercises(source.exercises);
  const title = sanitizeWorkoutTitle(source.title);
  if (exercises.length === 0 && !title) return false;
  persistLog(userId, {
    ...current,
    days: {
      ...current.days,
      [toDateKey]: { date: toDateKey, title, exercises },
    },
  });
  return true;
}

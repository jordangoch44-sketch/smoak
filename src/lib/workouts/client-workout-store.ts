import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { CLIENT_WORKOUTS_STORAGE_PREFIX } from "@/lib/dev-storage-keys";
import {
  cloneWorkoutExercises,
  DEFAULT_GOAL_DAYS_PER_WEEK,
  emptyClientWorkoutLog,
  sanitizeClientWorkoutLog,
  sanitizeWorkoutCardio,
  sanitizeWorkoutExercises,
  sanitizeWorkoutTitle,
  clampGoalDaysPerWeek,
} from "@/lib/workouts/client-workout";
import {
  fetchClientWorkoutLog,
  upsertClientWorkoutLog,
} from "@/lib/workouts/client-workout-service";
import type {
  ClientWorkoutCardio,
  ClientWorkoutExercise,
  ClientWorkoutLog,
} from "@/types/client-workout";

const EMPTY_LOG: ClientWorkoutLog = emptyClientWorkoutLog();
const listeners = new Set<() => void>();

let cachedUserId: string | null = null;
let cachedLog: ClientWorkoutLog = EMPTY_LOG;
let writeSeq = 0;
let hydratedUserId: string | null = null;
let hydrateInFlightUserId: string | null = null;

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

function writeLocal(userId: string, log: ClientWorkoutLog): void {
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

function logHasAccountContent(log: ClientWorkoutLog): boolean {
  return (
    log.goalDaysPerWeek !== DEFAULT_GOAL_DAYS_PER_WEEK ||
    Object.keys(log.days).length > 0
  );
}

function logsEqual(left: ClientWorkoutLog, right: ClientWorkoutLog): boolean {
  if (left.goalDaysPerWeek !== right.goalDaysPerWeek) return false;
  const leftKeys = Object.keys(left.days).sort();
  const rightKeys = Object.keys(right.days).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  for (let index = 0; index < leftKeys.length; index += 1) {
    const key = leftKeys[index]!;
    if (key !== rightKeys[index]) return false;
    if (JSON.stringify(left.days[key]) !== JSON.stringify(right.days[key])) {
      return false;
    }
  }
  return true;
}

/** Account row wins on the same day. Days that exist only on this device are kept. */
function mergeLogs(
  local: ClientWorkoutLog,
  remote: ClientWorkoutLog
): ClientWorkoutLog {
  return sanitizeClientWorkoutLog({
    goalDaysPerWeek: remote.goalDaysPerWeek,
    days: { ...local.days, ...remote.days },
  });
}

function persistLog(userId: string, log: ClientWorkoutLog): void {
  writeLocal(userId, log);
  const seq = ++writeSeq;
  void syncLog(userId, log, seq);
}

async function syncLog(
  userId: string,
  log: ClientWorkoutLog,
  seq: number
): Promise<boolean> {
  if (seq !== writeSeq) return true;
  if (!isMarketplaceSupabaseActive()) return true;
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return true;
  const result = await upsertClientWorkoutLog(supabase, userId, log);
  if (!result.ok) {
    if (seq === writeSeq) {
      console.warn(
        "[client-workouts] save did not reach the account",
        result.message
      );
    }
    return false;
  }
  if (seq !== writeSeq && cachedUserId === userId) {
    return syncLog(userId, cachedLog, writeSeq);
  }
  return true;
}

/**
 * Pull the account log and fold in any days that only exist on this device.
 * Edits made while the pull is in flight stay on screen and are saved after.
 */
export function ensureClientWorkoutsHydrated(userId: string): void {
  const id = userId.trim();
  if (!id || hydratedUserId === id || hydrateInFlightUserId === id) return;
  if (!isMarketplaceSupabaseActive()) {
    hydratedUserId = id;
    return;
  }
  hydrateInFlightUserId = id;
  void hydrateFromAccount(id).finally(() => {
    if (hydrateInFlightUserId === id) hydrateInFlightUserId = null;
  });
}

async function hydrateFromAccount(userId: string): Promise<void> {
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return;
  const seqAtStart = writeSeq;
  const local = getClientWorkoutLog(userId);
  const result = await fetchClientWorkoutLog(supabase, userId);
  if (cachedUserId !== userId || writeSeq !== seqAtStart) return;
  if (!result.ok) {
    console.warn("[client-workouts] account load failed", result.message);
    return;
  }

  if (!result.log) {
    if (logHasAccountContent(local)) {
      const pushed = await syncLog(userId, local, seqAtStart);
      if (!pushed) return;
    }
    hydratedUserId = userId;
    return;
  }

  const merged = mergeLogs(local, result.log);
  if (!logsEqual(merged, local)) {
    writeLocal(userId, merged);
  }
  if (!logsEqual(merged, result.log)) {
    const pushed = await syncLog(userId, merged, writeSeq);
    if (!pushed) return;
  }
  hydratedUserId = userId;
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
  title = "",
  cardio?: ClientWorkoutCardio | null
): boolean {
  const nextExercises = sanitizeWorkoutExercises(exercises);
  const nextTitle = sanitizeWorkoutTitle(title);
  const nextCardio = sanitizeWorkoutCardio(cardio);
  if (nextExercises.length === 0 && !nextTitle && !nextCardio) return false;
  const current = getClientWorkoutLog(userId);
  persistLog(userId, {
    ...current,
    days: {
      ...current.days,
      [dateKey]: {
        date: dateKey,
        title: nextTitle,
        exercises: nextExercises,
        ...(nextCardio ? { cardio: nextCardio } : {}),
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
  const copiedCardio = sanitizeWorkoutCardio(source.cardio);
  const cardio = copiedCardio
    ? { type: copiedCardio.type, duration: copiedCardio.duration }
    : undefined;
  if (exercises.length === 0 && !title && !cardio) return false;
  persistLog(userId, {
    ...current,
    days: {
      ...current.days,
      [toDateKey]: {
        date: toDateKey,
        title,
        exercises,
        ...(cardio ? { cardio } : {}),
      },
    },
  });
  return true;
}

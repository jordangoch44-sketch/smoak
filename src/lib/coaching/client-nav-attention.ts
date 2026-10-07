import { CLIENT_NAV_SEEN_KEY } from "@/lib/dev-storage-keys";
import {
  COACH_NOTICE_WINDOW_MS,
  readLocalFinishedSeen,
  unseenCoachCompletions,
} from "@/lib/coaching/coach-workout";
import type { CoachingRelationship, CoachWorkout } from "@/types/coaching";

/**
 * Clients-tab dot. Lights for roster events the specialist has not opened yet:
 * a client joined from an invite link or accepted an invite, or finished a
 * workout the specialist sent. Same two-week window as the finished-workout banner.
 */

const MAX_SEEN_WORKOUTS = 200;

export interface ClientNavSeen {
  /** Active relationship id → respondedAt already opened on Clients. */
  relationships: Readonly<Record<string, string>>;
  /** Finished workout ids already opened on Clients. */
  workouts: readonly string[];
}

export const EMPTY_CLIENT_NAV_SEEN: ClientNavSeen = {
  relationships: {},
  workouts: [],
};

export interface ClientNavAttention {
  show: boolean;
  relationshipIds: readonly string[];
  workoutIds: readonly string[];
}

export const EMPTY_CLIENT_NAV_ATTENTION: ClientNavAttention = {
  show: false,
  relationshipIds: [],
  workoutIds: [],
};

interface StoredSeen {
  relationships?: Record<string, unknown>;
  workouts?: unknown;
}

function normalizeSeen(value: StoredSeen | undefined): ClientNavSeen {
  const relationships: Record<string, string> = {};
  if (value?.relationships && typeof value.relationships === "object") {
    for (const [id, stamp] of Object.entries(value.relationships)) {
      if (typeof stamp === "string" && stamp) relationships[id] = stamp;
    }
  }
  const workouts = Array.isArray(value?.workouts)
    ? value.workouts.filter((id): id is string => typeof id === "string")
    : [];
  return { relationships, workouts };
}

function seenEqual(a: ClientNavSeen, b: ClientNavSeen): boolean {
  if (a.workouts.length !== b.workouts.length) return false;
  if (a.workouts.some((id, index) => id !== b.workouts[index])) return false;
  const aKeys = Object.keys(a.relationships);
  const bKeys = Object.keys(b.relationships);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((id) => a.relationships[id] === b.relationships[id]);
}

let memory: Record<string, StoredSeen> | null = null;
const snapshots = new Map<string, ClientNavSeen>();
const listeners = new Set<() => void>();

function readMemory(): Record<string, StoredSeen> {
  if (memory) return memory;
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(window.localStorage.getItem(CLIENT_NAV_SEEN_KEY) || "{}") as unknown;
    memory = raw && typeof raw === "object" ? (raw as Record<string, StoredSeen>) : {};
  } catch {
    memory = {};
  }
  return memory;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeClientNavSeen(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window === "undefined") {
    return () => listeners.delete(listener);
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== CLIENT_NAV_SEEN_KEY) return;
    memory = null;
    snapshots.clear();
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getClientNavSeenSnapshot(specialistId: string | null): ClientNavSeen {
  if (!specialistId) return EMPTY_CLIENT_NAV_SEEN;
  const next = normalizeSeen(readMemory()[specialistId]);
  const cached = snapshots.get(specialistId);
  if (cached && seenEqual(cached, next)) return cached;
  snapshots.set(specialistId, next);
  return next;
}

export function getClientNavSeenServerSnapshot(): ClientNavSeen {
  return EMPTY_CLIENT_NAV_SEEN;
}

/** Unopened client joins and finished workouts. */
export function clientNavAttention(input: {
  relationships: readonly CoachingRelationship[];
  workouts: readonly CoachWorkout[];
  seen: ClientNavSeen;
  dismissedWorkoutIds?: readonly string[];
  now?: number;
}): ClientNavAttention {
  const now = input.now ?? Date.now();
  const relationshipIds: string[] = [];
  for (const relationship of input.relationships) {
    if (relationship.status !== "active" || !relationship.respondedAt) continue;
    const stamp = Date.parse(relationship.respondedAt);
    if (!Number.isFinite(stamp) || now - stamp > COACH_NOTICE_WINDOW_MS) continue;
    if (input.seen.relationships[relationship.id] === relationship.respondedAt) continue;
    relationshipIds.push(relationship.id);
  }

  const dismissed = new Set(input.dismissedWorkoutIds ?? []);
  const seenWorkouts = new Set(input.seen.workouts);
  const workoutIds = unseenCoachCompletions(input.workouts, now)
    .map((workout) => workout.id)
    .filter((id) => !seenWorkouts.has(id) && !dismissed.has(id));

  if (relationshipIds.length === 0 && workoutIds.length === 0) {
    return EMPTY_CLIENT_NAV_ATTENTION;
  }
  return { show: true, relationshipIds, workoutIds };
}

function pruneRelationships(
  relationships: Record<string, string>,
  now: number
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [id, stamp] of Object.entries(relationships)) {
    const parsed = Date.parse(stamp);
    if (Number.isFinite(parsed) && now - parsed <= COACH_NOTICE_WINDOW_MS) {
      next[id] = stamp;
    }
  }
  return next;
}

/** Opening Clients marks the current joins and finished workouts as seen. */
export function acknowledgeClientNav(
  specialistId: string,
  relationships: readonly CoachingRelationship[],
  workouts: readonly CoachWorkout[]
): void {
  if (!specialistId || typeof window === "undefined") return;
  const seen = getClientNavSeenSnapshot(specialistId);
  const attention = clientNavAttention({
    relationships,
    workouts,
    seen,
    dismissedWorkoutIds: readLocalFinishedSeen(),
  });
  if (!attention.show) return;

  const now = Date.now();
  const nextRelationships = { ...seen.relationships };
  const pending = new Set(attention.relationshipIds);
  for (const relationship of relationships) {
    if (pending.has(relationship.id) && relationship.respondedAt) {
      nextRelationships[relationship.id] = relationship.respondedAt;
    }
  }

  const next: ClientNavSeen = {
    relationships: pruneRelationships(nextRelationships, now),
    workouts: [...new Set([...seen.workouts, ...attention.workoutIds])].slice(-MAX_SEEN_WORKOUTS),
  };

  const all = readMemory();
  all[specialistId] = {
    relationships: { ...next.relationships },
    workouts: [...next.workouts],
  };
  memory = all;
  snapshots.set(specialistId, next);
  window.localStorage.setItem(CLIENT_NAV_SEEN_KEY, JSON.stringify(all));
  notify();
}

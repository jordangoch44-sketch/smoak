import { WORKOUT_NAV_SEEN_KEY } from "@/lib/dev-storage-keys";

/** Coach-sent workouts already opened from the Workouts tab or the notice. */

const MAX_SEEN = 200;
const EMPTY_SEEN: readonly string[] = [];

let memory: Record<string, string[]> | null = null;
const snapshots = new Map<string, readonly string[]>();
const listeners = new Set<() => void>();

function readMemory(): Record<string, string[]> {
  if (memory) return memory;
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(window.localStorage.getItem(WORKOUT_NAV_SEEN_KEY) || "{}") as unknown;
    memory = raw && typeof raw === "object" ? (raw as Record<string, string[]>) : {};
  } catch {
    memory = {};
  }
  return memory;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeWorkoutNavSeen(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window === "undefined") {
    return () => listeners.delete(listener);
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== WORKOUT_NAV_SEEN_KEY) return;
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

export function getWorkoutNavSeenSnapshot(userId: string | null): readonly string[] {
  if (!userId) return EMPTY_SEEN;
  const stored = readMemory()[userId];
  const list = Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [];
  const cached = snapshots.get(userId);
  if (cached && cached.length === list.length && cached.every((id, index) => id === list[index])) {
    return cached;
  }
  const next = list.slice();
  snapshots.set(userId, next);
  return next;
}

export function getWorkoutNavSeenServerSnapshot(): readonly string[] {
  return EMPTY_SEEN;
}

/** Opening Workouts, or the notice, marks these sent workouts as seen. */
export function acknowledgeWorkoutNav(userId: string, ids: readonly string[]): void {
  if (!userId || ids.length === 0 || typeof window === "undefined") return;
  const current = new Set(getWorkoutNavSeenSnapshot(userId));
  let changed = false;
  for (const id of ids) {
    if (!id || current.has(id)) continue;
    current.add(id);
    changed = true;
  }
  if (!changed) return;

  const next = [...current].slice(-MAX_SEEN);
  const all = readMemory();
  all[userId] = next;
  memory = all;
  snapshots.set(userId, next);
  window.localStorage.setItem(WORKOUT_NAV_SEEN_KEY, JSON.stringify(all));
  notify();
}

import {
  loadSavedTrainerIds,
  persistSavedTrainerIds,
} from "@/lib/saved-trainers-storage";

/** Stable empty snapshot — required for useSyncExternalStore server snapshot */
const EMPTY_SNAPSHOT: string[] = [];

/** In-memory cache + pub/sub for useSyncExternalStore */
let cachedIds: readonly string[] = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

function idsKey(ids: readonly string[]): string {
  return ids.length === 0 ? "" : ids.join("\0");
}

function readCache(): readonly string[] {
  if (typeof window === "undefined") {
    return EMPTY_SNAPSHOT;
  }

  if (cachedIds === EMPTY_SNAPSHOT) {
    const loaded = loadSavedTrainerIds();
    cachedIds = loaded.length > 0 ? [...loaded] : EMPTY_SNAPSHOT;
  }

  return cachedIds;
}

export function subscribeSavedTrainers(onStoreChange: () => void): () => void {
  if (typeof window !== "undefined") {
    readCache();
  }
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** Client snapshot — stable reference until the store updates */
export function getSavedTrainersSnapshot(): readonly string[] {
  return readCache();
}

/** Must return a cached value (same reference every call) */
export function getSavedTrainersServerSnapshot(): readonly string[] {
  return EMPTY_SNAPSHOT;
}

export function setSavedTrainerIds(next: string[]): void {
  const unique = [...new Set(next)];
  const nextCache: readonly string[] =
    unique.length > 0 ? unique : EMPTY_SNAPSHOT;

  if (idsKey(nextCache) === idsKey(cachedIds)) {
    return;
  }

  cachedIds = nextCache;
  persistSavedTrainerIds(unique);
  listeners.forEach((listener) => listener());
}


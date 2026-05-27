import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/auth-session-store";
import { getActiveClientUserId } from "@/lib/saved-trainers-user";
import {
  loadSavedTrainerIdsForUser,
  persistSavedTrainerIdsForUser,
} from "@/lib/saved-trainers-storage";

/** Stable empty snapshot — required for useSyncExternalStore server snapshot */
const EMPTY_SNAPSHOT: string[] = [];

/** In-memory cache + pub/sub for useSyncExternalStore */
let cachedIds: readonly string[] = EMPTY_SNAPSHOT;
let cachedForUserId: string | null = null;
const listeners = new Set<() => void>();

function idsKey(ids: readonly string[]): string {
  return ids.length === 0 ? "" : ids.join("\0");
}

function resolveClientUserId(): string | null {
  if (typeof window === "undefined") return null;
  return getActiveClientUserId(getAuthSessionSnapshot());
}

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

/** Drop in-memory saves on logout — per-user data remains in localStorage */
export function clearSavedTrainersActiveSession(): void {
  cachedForUserId = null;
  if (cachedIds === EMPTY_SNAPSHOT) return;
  cachedIds = EMPTY_SNAPSHOT;
  emitChange();
}

function reloadSavedTrainersForActiveUser(): void {
  if (typeof window === "undefined") return;

  const userId = resolveClientUserId();

  if (!userId) {
    clearSavedTrainersActiveSession();
    return;
  }

  if (userId === cachedForUserId) {
    return;
  }

  const loaded = loadSavedTrainerIdsForUser(userId);
  const nextCache: readonly string[] =
    loaded.length > 0 ? [...loaded] : EMPTY_SNAPSHOT;

  cachedForUserId = userId;
  if (idsKey(nextCache) === idsKey(cachedIds)) return;

  cachedIds = nextCache;
  emitChange();
}

function readCache(): readonly string[] {
  if (typeof window === "undefined") {
    return EMPTY_SNAPSHOT;
  }

  const userId = resolveClientUserId();

  if (!userId) {
    if (cachedForUserId !== null || cachedIds !== EMPTY_SNAPSHOT) {
      clearSavedTrainersActiveSession();
    }
    return EMPTY_SNAPSHOT;
  }

  if (userId !== cachedForUserId) {
    reloadSavedTrainersForActiveUser();
  }

  return cachedIds;
}

export function subscribeSavedTrainers(onStoreChange: () => void): () => void {
  if (typeof window !== "undefined") {
    readCache();
  }

  listeners.add(onStoreChange);

  const unsubAuth = subscribeAuthSession(() => {
    reloadSavedTrainersForActiveUser();
    onStoreChange();
  });

  return () => {
    listeners.delete(onStoreChange);
    unsubAuth();
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
  const userId = resolveClientUserId();
  if (!userId) return;

  const unique = [...new Set(next)];
  const nextCache: readonly string[] =
    unique.length > 0 ? unique : EMPTY_SNAPSHOT;

  if (userId === cachedForUserId && idsKey(nextCache) === idsKey(cachedIds)) {
    return;
  }

  cachedForUserId = userId;
  cachedIds = nextCache;
  persistSavedTrainerIdsForUser(userId, unique);
  emitChange();
}

import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/auth-session-store";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { getActiveClientUserId } from "@/lib/saved-trainers-user";
import {
  clearLocalSavedTrainersForUser,
  loadSavedTrainerIdsForUser,
  persistSavedTrainerIdsForUser,
} from "@/lib/saved-trainers-storage";
import {
  deleteSavedTrainer,
  fetchSavedTrainerIds,
  importLocalSavedTrainers,
  insertSavedTrainer,
} from "@/lib/saved-trainers-service";

/** Stable empty snapshot — required for useSyncExternalStore server snapshot */
const EMPTY_SNAPSHOT: string[] = [];

/** In-memory cache + pub/sub for useSyncExternalStore */
let cachedIds: readonly string[] = EMPTY_SNAPSHOT;
/** User id the cache currently belongs to (set as soon as a load starts). */
let cachedForUserId: string | null = null;
/** True after a load attempt finished for cachedForUserId (success or error). */
let hasLoadedForCachedUser = false;
let isLoading = false;
let loadError: string | null = null;
let loadGeneration = 0;
let emitDepth = 0;
const listeners = new Set<() => void>();

function idsKey(ids: readonly string[]): string {
  return ids.length === 0 ? "" : ids.join("\0");
}

function resolveClientUserId(): string | null {
  if (typeof window === "undefined") return null;
  return getActiveClientUserId(getAuthSessionSnapshot());
}

function emitChange(): void {
  /* Guard nested getSnapshot → scheduleReload → emitChange re-entry.
   * Nested notifies are coalesced into a single trailing emit. */
  if (emitDepth > 0) {
    emitDepth = -1;
    return;
  }
  emitDepth = 1;
  try {
    do {
      emitDepth = 1;
      listeners.forEach((listener) => {
        try {
          listener();
        } catch (error) {
          console.error("[saved-trainers] listener error", error);
        }
      });
    } while (emitDepth < 0);
  } finally {
    emitDepth = 0;
  }
}

function applyCache(userId: string, ids: readonly string[]): void {
  const unique = [...new Set(ids)];
  const nextCache: readonly string[] =
    unique.length > 0 ? unique : EMPTY_SNAPSHOT;

  if (
    userId === cachedForUserId &&
    hasLoadedForCachedUser &&
    idsKey(nextCache) === idsKey(cachedIds)
  ) {
    return;
  }

  cachedForUserId = userId;
  cachedIds = nextCache;
  hasLoadedForCachedUser = true;
  emitChange();
}

/** Max wait for Supabase saved-trainers fetch before showing cached/error state */
const SAVED_TRAINERS_FETCH_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Loading saved specialists timed out. Try again."));
    }, ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

/** Force-clear a stuck loading spinner (UI timeout safety). */
export function markSavedTrainersLoadTimedOut(): void {
  if (!isLoading) return;
  isLoading = false;
  hasLoadedForCachedUser = true;
  if (!loadError) {
    loadError = "Loading saved specialists timed out. Showing what we have.";
  }
  emitChange();
}

/** Drop in-memory saves on logout — Supabase rows remain per user */
export function clearSavedTrainersActiveSession(): void {
  loadGeneration += 1;
  cachedForUserId = null;
  hasLoadedForCachedUser = false;
  isLoading = false;
  loadError = null;
  if (cachedIds === EMPTY_SNAPSHOT) {
    emitChange();
    return;
  }
  cachedIds = EMPTY_SNAPSHOT;
  emitChange();
}

function reloadSavedTrainersFromLocalStorage(userId: string): void {
  const loaded = loadSavedTrainerIdsForUser(userId);
  applyCache(userId, loaded);
}

async function reloadSavedTrainersForActiveUserAsync(): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = resolveClientUserId();

  if (!userId) {
    clearSavedTrainersActiveSession();
    return;
  }

  /* Already loaded (including empty shortlist) — do not refetch in a loop. */
  if (
    userId === cachedForUserId &&
    hasLoadedForCachedUser &&
    !isLoading &&
    loadError === null
  ) {
    return;
  }

  /* In-flight load for this user — wait; do not stack nested emitChange. */
  if (userId === cachedForUserId && isLoading) {
    return;
  }

  if (!isMarketplaceSupabaseActive()) {
    reloadSavedTrainersFromLocalStorage(userId);
    isLoading = false;
    loadError = null;
    emitChange();
    return;
  }

  const generation = ++loadGeneration;
  /* Claim ownership before emitting so getSnapshot does not re-schedule. */
  cachedForUserId = userId;
  hasLoadedForCachedUser = false;
  isLoading = true;
  loadError = null;
  emitChange();

  const supabase = getMarketplaceAuthClient();

  try {
    if (!supabase) {
      throw new Error("Saved specialists require Supabase.");
    }

    const localIds = loadSavedTrainerIdsForUser(userId);
    let specialistIds: string[];

    if (localIds.length > 0) {
      const imported = await withTimeout(
        importLocalSavedTrainers(supabase, userId, localIds),
        SAVED_TRAINERS_FETCH_TIMEOUT_MS
      );
      if (!imported.ok) {
        throw new Error(imported.message);
      }
      specialistIds = imported.specialistIds;
      clearLocalSavedTrainersForUser(userId);
    } else {
      const remote = await withTimeout(
        fetchSavedTrainerIds(supabase, userId),
        SAVED_TRAINERS_FETCH_TIMEOUT_MS
      );
      if (!remote.ok) {
        throw new Error(remote.message);
      }
      specialistIds = remote.specialistIds;
    }

    if (generation !== loadGeneration) return;

    applyCache(userId, specialistIds);
    loadError = null;
  } catch (error) {
    if (generation !== loadGeneration) return;

    console.error("[saved-trainers] load failed", error);
    loadError =
      error instanceof Error ? error.message : "Failed to load saved specialists";
    reloadSavedTrainersFromLocalStorage(userId);
    hasLoadedForCachedUser = true;
  } finally {
    if (generation === loadGeneration) {
      isLoading = false;
      emitChange();
    }
  }
}

function scheduleReloadForActiveUser(): void {
  void reloadSavedTrainersForActiveUserAsync();
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
    /* Schedule async load; do not emit synchronously from getSnapshot. */
    scheduleReloadForActiveUser();
    return EMPTY_SNAPSHOT;
  }

  if (!hasLoadedForCachedUser && !isLoading) {
    scheduleReloadForActiveUser();
  }

  return cachedIds;
}

export function subscribeSavedTrainers(onStoreChange: () => void): () => void {
  if (typeof window !== "undefined") {
    /* Kick off initial load without nesting emitChange in getSnapshot. */
    queueMicrotask(() => {
      scheduleReloadForActiveUser();
    });
  }

  listeners.add(onStoreChange);

  const unsubAuth = subscribeAuthSession(() => {
    const userId = resolveClientUserId();
    if (!userId) {
      clearSavedTrainersActiveSession();
    } else if (userId !== cachedForUserId) {
      /* User switched — reset and load once for the new account. */
      cachedForUserId = null;
      hasLoadedForCachedUser = false;
      cachedIds = EMPTY_SNAPSHOT;
      isLoading = false;
      loadError = null;
      emitChange();
      scheduleReloadForActiveUser();
    }
    /* Do NOT reload when cache is intentionally empty for this user —
     * that previously caused an infinite load loop after every auth tick. */
    onStoreChange();
  });

  return () => {
    listeners.delete(onStoreChange);
    unsubAuth();
  };
}

export function getSavedTrainersSnapshot(): readonly string[] {
  return readCache();
}

export function getSavedTrainersServerSnapshot(): readonly string[] {
  return EMPTY_SNAPSHOT;
}

export function getSavedTrainersLoadingSnapshot(): boolean {
  return isLoading;
}

export function getSavedTrainersLoadingServerSnapshot(): boolean {
  return false;
}

export function getSavedTrainersErrorSnapshot(): string | null {
  return loadError;
}

export function getSavedTrainersErrorServerSnapshot(): string | null {
  return null;
}

export type ToggleSavedTrainerResult =
  | { ok: true }
  | { ok: false; message: string };

export async function toggleSavedTrainerId(
  trainerId: string
): Promise<ToggleSavedTrainerResult> {
  const userId = resolveClientUserId();
  const id = trainerId.trim();
  if (!userId || !id) {
    return { ok: false, message: "Sign in as a client to save specialists." };
  }

  /* Ensure we mutate against the loaded list for this user. */
  if (userId !== cachedForUserId || !hasLoadedForCachedUser) {
    await reloadSavedTrainersForActiveUserAsync();
  }

  const previous = [...(cachedForUserId === userId ? cachedIds : [])];
  const removing = previous.includes(id);
  const next = removing
    ? previous.filter((entry) => entry !== id)
    : [...previous, id];

  applyCache(userId, next);

  if (!isMarketplaceSupabaseActive()) {
    persistSavedTrainerIdsForUser(userId, next);
    return { ok: true };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    applyCache(userId, previous);
    return { ok: false, message: "Unable to save — try again shortly." };
  }

  try {
    const mutation = removing
      ? await deleteSavedTrainer(supabase, userId, id)
      : await insertSavedTrainer(supabase, userId, id);

    if (!mutation.ok) {
      console.error("[saved-trainers] mutation failed", {
        removing,
        userId,
        specialistId: id,
        message: mutation.message,
      });
      applyCache(userId, previous);
      return { ok: false, message: mutation.message };
    }

    /* Supabase is SoT when active — no local mirror after successful write. */
    return { ok: true };
  } catch (error) {
    console.error("[saved-trainers] mutation threw", error);
    applyCache(userId, previous);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not update saved specialists.",
    };
  }
}

export async function addSavedTrainerId(
  specialistId: string
): Promise<ToggleSavedTrainerResult> {
  const id = specialistId.trim();
  if (!id) return { ok: false, message: "Invalid specialist id" };

  const userId = resolveClientUserId();
  if (
    userId &&
    cachedForUserId === userId &&
    hasLoadedForCachedUser &&
    cachedIds.includes(id)
  ) {
    return { ok: true };
  }

  return toggleSavedTrainerId(id);
}

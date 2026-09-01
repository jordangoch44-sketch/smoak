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
/** Bumps on every heart add/remove so a stale in-flight fetch cannot wipe it. */
let mutationEpoch = 0;
/** Shared in-flight load so toggleSaved can await instead of racing. */
let loadPromise: Promise<void> | null = null;
/** Debounce clearing when auth briefly flickers null (TOKEN_REFRESHED). */
let clearSessionTimer: number | null = null;
let emitDepth = 0;
const listeners = new Set<() => void>();

function idsKey(ids: readonly string[]): string {
  return ids.length === 0 ? "" : ids.join("\0");
}

/**
 * Prefer live Supabase auth uid (matches RLS). Fall back to session snapshot
 * so hearts still work before the auth client finishes hydrating.
 */
async function resolvePersistedUserId(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const session = getAuthSessionSnapshot();
  if (!session || session.role !== "client") {
    return null;
  }

  const supabase = getMarketplaceAuthClient();
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const authId = data.session?.user?.id?.trim();
      if (authId) return authId;
    } catch {
      /* fall through */
    }
  }

  return getActiveClientUserId(session);
}

function resolveClientUserIdSync(): string | null {
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
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
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
  if (clearSessionTimer != null) {
    window.clearTimeout(clearSessionTimer);
    clearSessionTimer = null;
  }
  loadGeneration += 1;
  mutationEpoch += 1;
  loadPromise = null;
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

function scheduleClearIfStillSignedOut(): void {
  if (typeof window === "undefined") return;
  if (clearSessionTimer != null) {
    window.clearTimeout(clearSessionTimer);
  }
  clearSessionTimer = window.setTimeout(() => {
    clearSessionTimer = null;
    if (resolveClientUserIdSync()) return;
    clearSavedTrainersActiveSession();
  }, 400);
}

function reloadSavedTrainersFromLocalStorage(userId: string): void {
  const loaded = loadSavedTrainerIdsForUser(userId);
  applyCache(userId, loaded);
}

async function reloadSavedTrainersForActiveUserAsync(
  options?: { force?: boolean }
): Promise<void> {
  if (typeof window === "undefined") return;

  const userId = await resolvePersistedUserId();

  if (!userId) {
    scheduleClearIfStillSignedOut();
    return;
  }

  if (clearSessionTimer != null) {
    window.clearTimeout(clearSessionTimer);
    clearSessionTimer = null;
  }

  const force = Boolean(options?.force);

  /* Already loaded — skip unless caller forces a sync after a write. */
  if (
    !force &&
    userId === cachedForUserId &&
    hasLoadedForCachedUser &&
    !isLoading &&
    loadError === null
  ) {
    return;
  }

  /* Wait for the in-flight load instead of returning early (heart race). */
  if (loadPromise && userId === cachedForUserId && !force) {
    await loadPromise;
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
  const epochAtStart = mutationEpoch;
  const hadCacheForUser =
    userId === cachedForUserId && hasLoadedForCachedUser && cachedIds.length >= 0;
  cachedForUserId = userId;
  /*
   * Stale-while-revalidate: keep showing the current shortlist (and lit hearts)
   * while a background fetch runs. Only blank "loaded" on a true cold start.
   */
  if (!hadCacheForUser) {
    hasLoadedForCachedUser = false;
  }
  isLoading = true;
  loadError = null;
  emitChange();

  const supabase = getMarketplaceAuthClient();

  loadPromise = (async () => {
    try {
      if (!supabase) {
        throw new Error("Saved specialists require Supabase.");
      }

      let remote = await withTimeout(
        fetchSavedTrainerIds(supabase, userId),
        SAVED_TRAINERS_FETCH_TIMEOUT_MS
      );
      if (!remote.ok) {
        throw new Error(remote.message);
      }

      if (generation !== loadGeneration) return;

      /*
       * Heart toggled while this fetch was in flight. Re-fetch once so we do
       * not apply a stale empty list over an optimistic save.
       */
      if (mutationEpoch !== epochAtStart) {
        const refreshed = await withTimeout(
          fetchSavedTrainerIds(supabase, userId),
          SAVED_TRAINERS_FETCH_TIMEOUT_MS
        );
        if (!refreshed.ok) {
          throw new Error(refreshed.message);
        }
        if (generation !== loadGeneration) return;
        remote = refreshed;
      }

      const remoteIds = remote.specialistIds;
      let merged =
        mutationEpoch !== epochAtStart &&
        cachedForUserId === userId &&
        cachedIds.length > 0
          ? [...new Set([...remoteIds, ...cachedIds])]
          : remoteIds;

      /* Bridge: keep browser backup when remote momentarily returns empty after a heart. */
      if (merged.length === 0) {
        const localBackup = loadSavedTrainerIdsForUser(userId);
        if (localBackup.length > 0) {
          merged = localBackup;
        }
      }

      if (remoteIds.length > 0) {
        clearLocalSavedTrainersForUser(userId);
      }
      applyCache(userId, merged);
      loadError = null;
    } catch (error) {
      if (generation !== loadGeneration) return;

      console.error("[saved-trainers] load failed", error);
      loadError =
        error instanceof Error
          ? error.message
          : "Failed to load saved specialists";

      /* Keep whatever we already showed — never wipe hearts on a fetch failure. */
      if (cachedForUserId === userId && cachedIds.length > 0) {
        hasLoadedForCachedUser = true;
      } else if (!hadCacheForUser) {
        applyCache(userId, []);
        hasLoadedForCachedUser = true;
      } else {
        hasLoadedForCachedUser = true;
      }
    } finally {
      if (generation === loadGeneration) {
        isLoading = false;
        emitChange();
      }
    }
  })();

  try {
    await loadPromise;
  } finally {
    if (generation === loadGeneration) {
      loadPromise = null;
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

  const userId = resolveClientUserIdSync();

  if (!userId) {
    if (cachedForUserId !== null || cachedIds !== EMPTY_SNAPSHOT) {
      scheduleClearIfStillSignedOut();
    }
    /* Keep last shortlist visible during a brief auth flicker. */
    return cachedIds;
  }

  if (userId !== cachedForUserId) {
    scheduleReloadForActiveUser();
    /* If we already have ids for a prior paint of this account, keep them. */
    return cachedForUserId === userId ? cachedIds : EMPTY_SNAPSHOT;
  }

  if (!hasLoadedForCachedUser && !isLoading) {
    scheduleReloadForActiveUser();
  }

  return cachedIds;
}

export function subscribeSavedTrainers(onStoreChange: () => void): () => void {
  if (typeof window !== "undefined") {
    queueMicrotask(() => {
      scheduleReloadForActiveUser();
    });
  }

  listeners.add(onStoreChange);

  const unsubAuth = subscribeAuthSession(() => {
    const userId = resolveClientUserIdSync();
    if (!userId) {
      scheduleClearIfStillSignedOut();
    } else {
      if (clearSessionTimer != null) {
        window.clearTimeout(clearSessionTimer);
        clearSessionTimer = null;
      }
      if (userId !== cachedForUserId) {
        loadGeneration += 1;
        mutationEpoch += 1;
        loadPromise = null;
        cachedForUserId = null;
        hasLoadedForCachedUser = false;
        cachedIds = EMPTY_SNAPSHOT;
        isLoading = false;
        loadError = null;
        emitChange();
        scheduleReloadForActiveUser();
      }
    }
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
  const id = trainerId.trim();
  if (!id) {
    return { ok: false, message: "Invalid specialist." };
  }

  const userId = await resolvePersistedUserId();
  if (!userId) {
    return { ok: false, message: "A client account is required to save specialists." };
  }

  if (clearSessionTimer != null) {
    window.clearTimeout(clearSessionTimer);
    clearSessionTimer = null;
  }

  /* Ensure we mutate against the loaded list for this user. */
  if (userId !== cachedForUserId || !hasLoadedForCachedUser) {
    await reloadSavedTrainersForActiveUserAsync();
  }

  if (userId !== cachedForUserId) {
    cachedForUserId = userId;
  }

  const previous = [...(cachedForUserId === userId ? cachedIds : [])];
  const removing = previous.includes(id);
  const next = removing
    ? previous.filter((entry) => entry !== id)
    : [...previous, id];

  mutationEpoch += 1;
  applyCache(userId, next);

  if (!isMarketplaceSupabaseActive()) {
    persistSavedTrainerIdsForUser(userId, next);
    return { ok: true };
  }

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    mutationEpoch += 1;
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
      mutationEpoch += 1;
      applyCache(userId, previous);
      return { ok: false, message: mutation.message };
    }

    /* Soft local backup so Favorites survives a flaky re-fetch after sheet close. */
    persistSavedTrainerIdsForUser(userId, next);

    /* Confirm from server, but never drop the id we just wrote. */
    await reloadSavedTrainersForActiveUserAsync({ force: true });
    if (cachedForUserId === userId) {
      const confirmed = removing
        ? cachedIds.filter((entry) => entry !== id)
        : cachedIds.includes(id)
          ? [...cachedIds]
          : [...cachedIds, id];
      applyCache(userId, confirmed);
      persistSavedTrainerIdsForUser(userId, confirmed);
    }

    return { ok: true };
  } catch (error) {
    console.error("[saved-trainers] mutation threw", error);
    mutationEpoch += 1;
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

  const userId = await resolvePersistedUserId();
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

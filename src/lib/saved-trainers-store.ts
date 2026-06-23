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
let cachedForUserId: string | null = null;
let isLoading = false;
let loadError: string | null = null;
let loadGeneration = 0;
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

function applyCache(userId: string, ids: readonly string[]): void {
  const unique = [...new Set(ids)];
  const nextCache: readonly string[] =
    unique.length > 0 ? unique : EMPTY_SNAPSHOT;

  if (userId === cachedForUserId && idsKey(nextCache) === idsKey(cachedIds)) {
    return;
  }

  cachedForUserId = userId;
  cachedIds = nextCache;
  emitChange();
}

/** Drop in-memory saves on logout — Supabase rows remain per user */
export function clearSavedTrainersActiveSession(): void {
  loadGeneration += 1;
  cachedForUserId = null;
  isLoading = false;
  loadError = null;
  if (cachedIds === EMPTY_SNAPSHOT) return;
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

  if (userId === cachedForUserId && !isLoading && loadError === null) {
    return;
  }

  if (!isMarketplaceSupabaseActive()) {
    reloadSavedTrainersFromLocalStorage(userId);
    isLoading = false;
    loadError = null;
    return;
  }

  const generation = ++loadGeneration;
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
      const imported = await importLocalSavedTrainers(
        supabase,
        userId,
        localIds
      );
      if (!imported.ok) {
        throw new Error(imported.message);
      }
      specialistIds = imported.specialistIds;
      clearLocalSavedTrainersForUser(userId);
    } else {
      const remote = await fetchSavedTrainerIds(supabase, userId);
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

    loadError =
      error instanceof Error ? error.message : "Failed to load saved specialists";
    reloadSavedTrainersFromLocalStorage(userId);
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
    scheduleReloadForActiveUser();
    return EMPTY_SNAPSHOT;
  }

  return cachedIds;
}

export function subscribeSavedTrainers(onStoreChange: () => void): () => void {
  if (typeof window !== "undefined") {
    readCache();
  }

  listeners.add(onStoreChange);

  const unsubAuth = subscribeAuthSession(() => {
    const userId = resolveClientUserId();
    if (!userId) {
      clearSavedTrainersActiveSession();
    } else if (userId !== cachedForUserId) {
      cachedForUserId = null;
      cachedIds = EMPTY_SNAPSHOT;
      isLoading = true;
      loadError = null;
      emitChange();
    }
    scheduleReloadForActiveUser();
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

  const previous = [...getSavedTrainersSnapshot()];
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

  const mutation = removing
    ? await deleteSavedTrainer(supabase, userId, id)
    : await insertSavedTrainer(supabase, userId, id);

  if (!mutation.ok) {
    applyCache(userId, previous);
    return { ok: false, message: mutation.message };
  }

  return { ok: true };
}

export async function addSavedTrainerId(
  specialistId: string
): Promise<ToggleSavedTrainerResult> {
  const id = specialistId.trim();
  if (!id) return { ok: false, message: "Invalid specialist id" };
  if (getSavedTrainersSnapshot().includes(id)) return { ok: true };
  return toggleSavedTrainerId(id);
}

import {
  DEV_SAVED_SPECIALISTS_KEY,
  LEGACY_SAVED_SPECIALISTS_KEY,
} from "@/lib/dev-storage-keys";
import { getSavedTrainersStorageKey } from "@/lib/saved-trainers-user";

function parseSavedIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is string => typeof id === "string"))];
  } catch {
    return [];
  }
}

function readKey(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return parseSavedIds(window.localStorage.getItem(storageKey));
  } catch {
    return [];
  }
}

function writeKey(storageKey: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    /* quota / private mode */
  }
}

function migrateLegacyGlobalKey(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_SAVED_SPECIALISTS_KEY);
    if (!legacyRaw) return [];
    window.localStorage.setItem(DEV_SAVED_SPECIALISTS_KEY, legacyRaw);
    window.localStorage.removeItem(LEGACY_SAVED_SPECIALISTS_KEY);
    return parseSavedIds(legacyRaw);
  } catch {
    return [];
  }
}

function readGlobalSavedIds(): string[] {
  const fromKey = readKey(DEV_SAVED_SPECIALISTS_KEY);
  if (fromKey.length > 0) return fromKey;
  return migrateLegacyGlobalKey();
}

/**
 * One-time move of pre-user-scoped saves into the active client key.
 * Global key is cleared so logged-out visitors never see it.
 */
function migrateGlobalSavedIdsToUser(userId: string): string[] {
  const userKey = getSavedTrainersStorageKey(userId);
  const existing = readKey(userKey);
  if (existing.length > 0) return existing;

  const global = readGlobalSavedIds();
  if (global.length === 0) return [];

  writeKey(userKey, global);
  try {
    window.localStorage.removeItem(DEV_SAVED_SPECIALISTS_KEY);
    window.localStorage.removeItem(LEGACY_SAVED_SPECIALISTS_KEY);
  } catch {
    /* ignore */
  }
  return global;
}

/** Load saved specialist ids for a signed-in client */
export function loadSavedTrainerIdsForUser(userId: string): string[] {
  if (!userId) return [];
  return migrateGlobalSavedIdsToUser(userId);
}

/** Persist saved specialist ids for a signed-in client */
export function persistSavedTrainerIdsForUser(userId: string, ids: string[]): void {
  if (!userId || typeof window === "undefined") return;

  const unique = [...new Set(ids)];
  const userKey = getSavedTrainersStorageKey(userId);

  try {
    if (unique.length === 0) {
      window.localStorage.removeItem(userKey);
    } else {
      window.localStorage.setItem(userKey, JSON.stringify(unique));
    }
  } catch {
    /* ignore */
  }
}

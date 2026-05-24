import {
  DEV_SAVED_SPECIALISTS_KEY,
  LEGACY_SAVED_SPECIALISTS_KEY,
} from "@/lib/dev-storage-keys";

function migrateLegacySavedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_SAVED_SPECIALISTS_KEY);
    if (!legacyRaw) return [];
    window.localStorage.setItem(DEV_SAVED_SPECIALISTS_KEY, legacyRaw);
    window.localStorage.removeItem(LEGACY_SAVED_SPECIALISTS_KEY);
    const parsed = JSON.parse(legacyRaw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function loadSavedTrainerIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(DEV_SAVED_SPECIALISTS_KEY);
    if (!raw) {
      const migrated = migrateLegacySavedIds();
      if (migrated.length > 0) return migrated;
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function persistSavedTrainerIds(ids: string[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      DEV_SAVED_SPECIALISTS_KEY,
      JSON.stringify(ids)
    );
    window.localStorage.removeItem(LEGACY_SAVED_SPECIALISTS_KEY);
  } catch {
    // Quota or privacy mode — fail silently for now
  }
}

/** DEV ONLY — canonical saved specialists storage key */
export { DEV_SAVED_SPECIALISTS_KEY as SAVED_TRAINERS_STORAGE_KEY };

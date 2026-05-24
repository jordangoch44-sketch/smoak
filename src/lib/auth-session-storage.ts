import type { AuthSession } from "@/types/auth";
import {
  DEV_AUTH_STORAGE_KEY,
  LEGACY_AUTH_STORAGE_KEY,
} from "@/lib/dev-storage-keys";

function migrateLegacyAuth(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
    if (!legacyRaw) return null;
    const parsed = JSON.parse(legacyRaw) as AuthSession;
    if (
      (parsed.role === "client" || parsed.role === "specialist") &&
      typeof parsed.email === "string"
    ) {
      window.localStorage.setItem(DEV_AUTH_STORAGE_KEY, legacyRaw);
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEV_AUTH_STORAGE_KEY);
    if (!raw) {
      const migrated = migrateLegacyAuth();
      if (migrated) return migrated;
      return null;
    }
    const parsed = JSON.parse(raw) as AuthSession;
    if (
      (parsed.role === "client" || parsed.role === "specialist") &&
      typeof parsed.email === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function persistAuthSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify(session));
}

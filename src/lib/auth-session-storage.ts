import type { AuthSession } from "@/types/auth";
import {
  DEV_AUTH_STORAGE_KEY,
  LEGACY_AUTH_STORAGE_KEY,
} from "@/lib/dev-storage-keys";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { persistInternalAuthSession } from "@/lib/internal-auth-session-storage";
import type { InternalAuthSession } from "@/types/internal-auth";

function internalSessionFromAuthSession(
  session: AuthSession
): InternalAuthSession | null {
  if (session.role !== "admin") return null;
  return {
    email: session.email,
    signedInAt: session.signedInAt,
    adminRole: session.adminRole ?? "owner_admin",
    displayName: session.displayName,
  };
}

function sanitizePublicSession(parsed: AuthSession): AuthSession | null {
  if (parsed.role === "admin") {
    const internal = internalSessionFromAuthSession(parsed);
    if (internal) {
      persistInternalAuthSession(internal);
      window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
    }
    return null;
  }
  if (
    (parsed.role === "client" || parsed.role === "specialist") &&
    typeof parsed.email === "string"
  ) {
    const userId =
      typeof parsed.userId === "string" && parsed.userId.trim()
        ? parsed.userId
        : `dev-${parsed.email.trim().toLowerCase()}`;
    return { ...parsed, userId };
  }
  return null;
}

function migrateLegacyAuth(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
    if (!legacyRaw) return null;
    const parsed = JSON.parse(legacyRaw) as AuthSession;
    if (typeof parsed.email === "string") {
      window.localStorage.setItem(DEV_AUTH_STORAGE_KEY, legacyRaw);
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
      return sanitizePublicSession(parsed);
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
    return sanitizePublicSession(parsed);
  } catch {
    return null;
  }
}

export function persistAuthSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  if (isSupabaseConfigured()) {
    if (!session) {
      window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
    }
    return;
  }
  if (!session) {
    window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    return;
  }
  if (session.role === "admin") return;
  window.localStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify(session));
}

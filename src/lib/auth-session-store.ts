import {
  loadAuthSession,
  persistAuthSession,
} from "@/lib/auth-session-storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AuthSession } from "@/types/auth";

const listeners = new Set<() => void>();
let cachedSession: AuthSession | null | undefined;

/** Force-clear in-memory auth cache (logout / hard reset). */
export function resetAuthSessionCache(): void {
  cachedSession = isSupabaseConfigured() ? null : undefined;
  listeners.forEach((listener) => listener());
}

function readCache(): AuthSession | null {
  if (typeof window === "undefined") return null;
  if (cachedSession === undefined) {
    cachedSession = isSupabaseConfigured() ? null : loadAuthSession();
  }
  return cachedSession;
}

export function subscribeAuthSession(onStoreChange: () => void): () => void {
  if (typeof window !== "undefined") {
    readCache();
  }
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getAuthSessionSnapshot(): AuthSession | null {
  return readCache();
}

export function getAuthSessionServerSnapshot(): AuthSession | null {
  return null;
}

function sessionSignature(session: AuthSession | null): string {
  if (!session) return "";
  /* Omit signedInAt — it can change every refresh when last_sign_in_at is
   * missing (Date.now fallback), which retriggers effects and hangs UI. */
  return JSON.stringify({
    userId: session.userId,
    role: session.role,
    email: session.email,
    firstName: session.firstName ?? "",
    displayName: session.displayName ?? "",
    clientZipCode: session.clientZipCode ?? "",
    clientCity: session.clientCity ?? "",
    avatarUrl: session.avatarUrl ?? "",
    profileCompletionStatus: session.profileCompletionStatus ?? "",
    passwordSetupStatus: session.passwordSetupStatus ?? "",
  });
}

export function setAuthSession(session: AuthSession | null): void {
  const prev = readCache();
  if (session === null) {
    if (prev === null && cachedSession === null) return;
    cachedSession = null;
    persistAuthSession(null);
    listeners.forEach((listener) => listener());
    return;
  }

  if (sessionSignature(prev) === sessionSignature(session)) return;

  cachedSession = session;
  persistAuthSession(session);
  listeners.forEach((listener) => listener());
}

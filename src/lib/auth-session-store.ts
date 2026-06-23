import {
  loadAuthSession,
  persistAuthSession,
} from "@/lib/auth-session-storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AuthSession } from "@/types/auth";

const listeners = new Set<() => void>();
let cachedSession: AuthSession | null | undefined;

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
  return JSON.stringify({
    userId: session.userId,
    role: session.role,
    email: session.email,
    firstName: session.firstName ?? "",
    clientZipCode: session.clientZipCode ?? "",
    clientCity: session.clientCity ?? "",
    signedInAt: session.signedInAt,
  });
}

export function setAuthSession(session: AuthSession | null): void {
  const prev = readCache();
  if (sessionSignature(prev) === sessionSignature(session)) return;

  cachedSession = session;
  persistAuthSession(session);
  listeners.forEach((listener) => listener());
}

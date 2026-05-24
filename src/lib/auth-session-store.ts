import {
  loadAuthSession,
  persistAuthSession,
} from "@/lib/auth-session-storage";
import type { AuthSession } from "@/types/auth";

const listeners = new Set<() => void>();
let cachedSession: AuthSession | null | undefined;

function readCache(): AuthSession | null {
  if (typeof window === "undefined") return null;
  if (cachedSession === undefined) {
    cachedSession = loadAuthSession();
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

export function setAuthSession(session: AuthSession | null): void {
  const prev = readCache();
  const prevKey = prev ? `${prev.role}:${prev.email}` : "";
  const nextKey = session ? `${session.role}:${session.email}` : "";
  if (prevKey === nextKey) return;

  cachedSession = session;
  persistAuthSession(session);
  listeners.forEach((listener) => listener());
}

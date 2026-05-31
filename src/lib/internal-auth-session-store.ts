import {
  loadInternalAuthSession,
  persistInternalAuthSession,
} from "@/lib/internal-auth-session-storage";
import type { InternalAuthSession } from "@/types/internal-auth";

const listeners = new Set<() => void>();
let cachedSession: InternalAuthSession | null | undefined;

function readCache(): InternalAuthSession | null {
  if (typeof window === "undefined") return null;
  if (cachedSession === undefined) {
    cachedSession = loadInternalAuthSession();
  }
  return cachedSession;
}

export function subscribeInternalAuthSession(
  onStoreChange: () => void
): () => void {
  if (typeof window !== "undefined") {
    readCache();
  }
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getInternalAuthSessionSnapshot(): InternalAuthSession | null {
  return readCache();
}

export function getInternalAuthSessionServerSnapshot(): InternalAuthSession | null {
  return null;
}

export function setInternalAuthSession(
  session: InternalAuthSession | null
): void {
  const prev = readCache();
  const prevKey = prev ? `${prev.adminRole}:${prev.email}` : "";
  const nextKey = session ? `${session.adminRole}:${session.email}` : "";
  if (prevKey === nextKey) return;

  cachedSession = session;
  persistInternalAuthSession(session);
  listeners.forEach((listener) => listener());
}

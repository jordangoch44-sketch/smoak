import type { InternalAuthSession } from "@/types/internal-auth";
import { INTERNAL_AUTH_STORAGE_KEY } from "@/lib/dev-storage-keys";

function isValidInternalSession(
  parsed: unknown
): parsed is InternalAuthSession {
  if (!parsed || typeof parsed !== "object") return false;
  const s = parsed as InternalAuthSession;
  return (
    typeof s.email === "string" &&
    typeof s.signedInAt === "string" &&
    (s.adminRole === "owner_admin" || s.adminRole === "staff_admin")
  );
}

export function loadInternalAuthSession(): InternalAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(INTERNAL_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (isValidInternalSession(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function persistInternalAuthSession(
  session: InternalAuthSession | null
): void {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(INTERNAL_AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(INTERNAL_AUTH_STORAGE_KEY, JSON.stringify(session));
}

import type { InternalAuthSession } from "@/types/internal-auth";

/** @deprecated Marketplace sessions are never admin — use isInternalAuthSession */
export function isAdminSession(): boolean {
  return false;
}

export function isInternalAuthSession(
  session: InternalAuthSession | null | undefined
): boolean {
  return session != null;
}

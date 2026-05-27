import type { AuthSession } from "@/types/auth";

/** Stable localStorage segment for a client account (mock auth — email-based) */
export function getClientUserId(session: AuthSession): string {
  return session.email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getSavedTrainersStorageKey(userId: string): string {
  return `smoac_saved_specialists_${userId}`;
}

/** Client accounts own saved specialists; specialists see none */
export function getActiveClientUserId(
  session: AuthSession | null | undefined
): string | null {
  if (!session || session.role !== "client") return null;
  const userId = getClientUserId(session);
  return userId.length > 0 ? userId : null;
}

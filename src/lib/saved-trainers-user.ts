import type { AuthSession } from "@/types/auth";

/** Stable storage segment for a client account — prefers Supabase user id */
export function getClientUserId(session: AuthSession): string {
  if (session.userId?.trim()) {
    return session.userId.trim();
  }
  return session.email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getSavedTrainersStorageKey(userId: string): string {
  return `smoac_saved_specialists_${userId}`;
}

/** Only client accounts own a saved shortlist */
export function getActiveClientUserId(
  session: AuthSession | null | undefined
): string | null {
  if (!session || session.role !== "client") {
    return null;
  }
  const userId = getClientUserId(session);
  return userId.length > 0 ? userId : null;
}

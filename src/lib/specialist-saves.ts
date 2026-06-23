/**
 * DEV ONLY — reusable specialist save + auth helpers for client workflows.
 */
import type { AuthSession } from "@/types/auth";
import type { PublicAuthRole } from "@/types/auth-roles";
import { setAuthSession } from "@/lib/auth-session-store";
import { consumePendingSave } from "@/lib/pending-save-storage";
import {
  clearSavedTrainersActiveSession,
  getSavedTrainersSnapshot,
  addSavedTrainerId,
} from "@/lib/saved-trainers-store";

export { isLoggedIn, getUserRole, canSaveSpecialists } from "@/lib/auth-session-helpers-core";

/** Clears session and in-memory saved specialists (Supabase rows remain per user) */
export async function logoutUser(): Promise<void> {
  clearSavedTrainersActiveSession();
  const { signOutMarketplace } = await import("@/lib/auth/marketplace-auth");
  await signOutMarketplace();
  setAuthSession(null);
}

/** DEV ONLY — saved specialist ids for the active signed-in client */
export function getSavedSpecialists(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  return [...getSavedTrainersSnapshot()];
}

/** Persist one specialist id without duplicates */
export async function saveSpecialist(specialistId: string): Promise<void> {
  const id = specialistId.trim();
  if (!id) return;

  if (getSavedSpecialists().includes(id)) return;

  await addSavedTrainerId(id);
}

export { setPendingSave, consumePendingSave, clearPendingSave, peekPendingSave } from "@/lib/pending-save-storage";

export type PostLoginPendingResult =
  | { kind: "client-saved"; specialistId: string }
  | { kind: "client-no-pending" }
  | { kind: "specialist-blocked" };

/**
 * DEV ONLY — after successful login, apply or discard pending save.
 * Call once immediately after signInWithPassword().
 */
export async function applyPendingSaveAfterLogin(
  role: PublicAuthRole
): Promise<PostLoginPendingResult> {
  const pendingId = consumePendingSave();

  if (role === "specialist") {
    return pendingId
      ? { kind: "specialist-blocked" }
      : { kind: "client-no-pending" };
  }

  if (pendingId) {
    await saveSpecialist(pendingId);
    return { kind: "client-saved", specialistId: pendingId };
  }

  return { kind: "client-no-pending" };
}

/** True when specialist id is in the saved library (reactive store snapshot) */
export function isSpecialistSaved(specialistId: string): boolean {
  return getSavedTrainersSnapshot().includes(specialistId);
}

export type { AuthSession };

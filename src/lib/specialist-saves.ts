/**
 * DEV ONLY — reusable specialist save + auth helpers for client workflows.
 */
import type { AuthRole, AuthSession } from "@/types/auth";
import { setAuthSession } from "@/lib/auth-session-store";
import { consumePendingSave } from "@/lib/pending-save-storage";
import {
  getSavedTrainersSnapshot,
  setSavedTrainerIds,
} from "@/lib/saved-trainers-store";
import { loadSavedTrainerIds } from "@/lib/saved-trainers-storage";

export { isLoggedIn, getUserRole, canSaveSpecialists } from "@/lib/auth-session-helpers-core";

/** DEV ONLY — clears localStorage session */
export function logoutUser(): void {
  setAuthSession(null);
}

/** DEV ONLY — all saved specialist ids from localStorage */
export function getSavedSpecialists(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  return [...loadSavedTrainerIds()];
}

/** DEV ONLY — persist one specialist id without duplicates */
export function saveSpecialist(specialistId: string): void {
  const id = specialistId.trim();
  if (!id) return;

  const current = getSavedSpecialists();
  if (current.includes(id)) return;

  setSavedTrainerIds([...current, id]);
}

export { setPendingSave, consumePendingSave, clearPendingSave, peekPendingSave } from "@/lib/pending-save-storage";

export type PostLoginPendingResult =
  | { kind: "client-saved"; specialistId: string }
  | { kind: "client-no-pending" }
  | { kind: "specialist-blocked" };

/**
 * DEV ONLY — after successful login, apply or discard pending save.
 * Call once immediately after signIn().
 */
export function applyPendingSaveAfterLogin(role: AuthRole): PostLoginPendingResult {
  const pendingId = consumePendingSave();

  if (role === "specialist") {
    return pendingId
      ? { kind: "specialist-blocked" }
      : { kind: "client-no-pending" };
  }

  if (pendingId) {
    saveSpecialist(pendingId);
    return { kind: "client-saved", specialistId: pendingId };
  }

  return { kind: "client-no-pending" };
}

/** True when specialist id is in the saved library (reactive store snapshot) */
export function isSpecialistSaved(specialistId: string): boolean {
  return getSavedTrainersSnapshot().includes(specialistId);
}

export type { AuthSession };

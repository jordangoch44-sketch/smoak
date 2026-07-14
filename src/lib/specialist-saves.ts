/**
 * Specialist save helpers + pending-save apply after client auth.
 * Storage primitives live in pending-save-storage.ts.
 */
import type { PublicAuthRole } from "@/types/auth-roles";
import {
  consumePendingSave,
  consumePendingSaveRecord,
  peekPendingSaveRecord,
} from "@/lib/pending-save-storage";
import {
  getSavedTrainersSnapshot,
  addSavedTrainerId,
} from "@/lib/saved-trainers-store";
import { clearSaveAutoApplyFlag } from "@/lib/inquiry/inquiry-session-flags";
import type { PendingSaveRecord } from "@/lib/dev-storage-keys";

export {
  isLoggedIn,
  getUserRole,
  canSaveSpecialists,
} from "@/lib/auth-session-helpers-core";

export { setPendingSave } from "@/lib/pending-save-storage";

/** Persist one specialist id without duplicates */
export async function saveSpecialist(specialistId: string): Promise<void> {
  const id = specialistId.trim();
  if (!id) return;

  if (typeof window === "undefined") return;
  if (getSavedTrainersSnapshot().includes(id)) return;

  await addSavedTrainerId(id);
}

export type PostLoginPendingResult =
  | { kind: "client-saved"; specialistId: string; record: PendingSaveRecord | null }
  | { kind: "client-no-pending" }
  | { kind: "specialist-blocked" };

let applyPendingInFlight: Promise<PostLoginPendingResult> | null = null;

async function applyPendingSaveAfterLoginInner(
  role: PublicAuthRole
): Promise<PostLoginPendingResult> {
  const peeked = peekPendingSaveRecord();

  if (role === "specialist") {
    if (peeked) {
      consumePendingSave();
      clearSaveAutoApplyFlag();
      return { kind: "specialist-blocked" };
    }
    return { kind: "client-no-pending" };
  }

  if (!peeked?.specialistId) {
    clearSaveAutoApplyFlag();
    return { kind: "client-no-pending" };
  }

  await saveSpecialist(peeked.specialistId);
  const record = consumePendingSaveRecord();
  clearSaveAutoApplyFlag();
  return {
    kind: "client-saved",
    specialistId: peeked.specialistId,
    record,
  };
}

/**
 * After successful client auth, apply pending save (if any).
 * Clears pending only after a successful write. Single-flight to avoid
 * duplicate confirmation when modal + resume bridge race.
 */
export async function applyPendingSaveAfterLogin(
  role: PublicAuthRole
): Promise<PostLoginPendingResult> {
  if (applyPendingInFlight) {
    return applyPendingInFlight;
  }
  applyPendingInFlight = applyPendingSaveAfterLoginInner(role).finally(() => {
    applyPendingInFlight = null;
  });
  return applyPendingInFlight;
}

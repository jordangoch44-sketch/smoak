import {
  DEV_PENDING_SAVE_KEY,
  type PendingSaveRecord,
} from "@/lib/dev-storage-keys";

function readPendingRecord(): PendingSaveRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEV_PENDING_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingSaveRecord;
    if (typeof parsed.specialistId === "string" && parsed.specialistId.trim()) {
      return {
        specialistId: parsed.specialistId.trim(),
        createdAt:
          typeof parsed.createdAt === "string"
            ? parsed.createdAt
            : new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function writePendingRecord(record: PendingSaveRecord | null): void {
  if (typeof window === "undefined") return;
  if (!record) {
    window.localStorage.removeItem(DEV_PENDING_SAVE_KEY);
    return;
  }
  window.localStorage.setItem(DEV_PENDING_SAVE_KEY, JSON.stringify(record));
}

/** DEV ONLY — queue a specialist save until the user logs in as client */
export function setPendingSave(specialistId: string): void {
  const id = specialistId.trim();
  if (!id) return;
  writePendingRecord({
    specialistId: id,
    createdAt: new Date().toISOString(),
  });
}

/** DEV ONLY — read pending specialist id without clearing */
export function peekPendingSave(): string | null {
  return readPendingRecord()?.specialistId ?? null;
}

/** DEV ONLY — remove pending save without applying */
export function clearPendingSave(): void {
  writePendingRecord(null);
}

/** DEV ONLY — read and clear pending specialist id */
export function consumePendingSave(): string | null {
  const record = readPendingRecord();
  clearPendingSave();
  return record?.specialistId ?? null;
}

import {
  DEV_PENDING_SAVE_KEY,
  type PendingSaveRecord,
} from "@/lib/dev-storage-keys";

export type { PendingSaveRecord };

function readPendingRecord(): PendingSaveRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEV_PENDING_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingSaveRecord;
    if (typeof parsed.specialistId === "string" && parsed.specialistId.trim()) {
      return {
        specialistId: parsed.specialistId.trim(),
        specialistName:
          typeof parsed.specialistName === "string"
            ? parsed.specialistName.trim()
            : undefined,
        profilePath:
          typeof parsed.profilePath === "string" && parsed.profilePath.trim()
            ? parsed.profilePath.trim()
            : undefined,
        actionType: "save_specialist",
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

export function setPendingSave(
  specialistId: string,
  options?: {
    specialistName?: string;
    profilePath?: string;
  }
): void {
  const id = specialistId.trim();
  if (!id) return;
  const path =
    options?.profilePath?.trim() ||
    (typeof window !== "undefined" ? window.location.pathname : "") ||
    `/trainers/${id}`;
  writePendingRecord({
    specialistId: id,
    specialistName: options?.specialistName?.trim() || undefined,
    profilePath: path,
    actionType: "save_specialist",
    createdAt: new Date().toISOString(),
  });
}

export function peekPendingSave(): string | null {
  return readPendingRecord()?.specialistId ?? null;
}

export function peekPendingSaveRecord(): PendingSaveRecord | null {
  return readPendingRecord();
}

export function clearPendingSave(): void {
  writePendingRecord(null);
}

/** Read and clear pending specialist id */
export function consumePendingSave(): string | null {
  const record = readPendingRecord();
  clearPendingSave();
  return record?.specialistId ?? null;
}

/** Read full record and clear — used after auth so we can show confirmation copy */
export function consumePendingSaveRecord(): PendingSaveRecord | null {
  const record = readPendingRecord();
  clearPendingSave();
  return record;
}

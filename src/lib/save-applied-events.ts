import type { PendingSaveRecord } from "@/lib/dev-storage-keys";

export const SAVE_APPLIED_EVENT = "smoac:save-applied";

export function emitSaveApplied(record: PendingSaveRecord): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PendingSaveRecord>(SAVE_APPLIED_EVENT, { detail: record })
  );
}

export function subscribeSaveApplied(
  handler: (record: PendingSaveRecord) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  function onEvent(event: Event) {
    const detail = (event as CustomEvent<PendingSaveRecord>).detail;
    if (detail?.specialistId) {
      handler(detail);
    }
  }

  window.addEventListener(SAVE_APPLIED_EVENT, onEvent);
  return () => window.removeEventListener(SAVE_APPLIED_EVENT, onEvent);
}

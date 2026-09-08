const HIDDEN_KEY_PREFIX = "smoac_hidden_inquiries_";

function storageKey(specialistId: string): string {
  return `${HIDDEN_KEY_PREFIX}${specialistId.trim()}`;
}

function readIds(specialistId: string): string[] {
  if (typeof window === "undefined" || !specialistId.trim()) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(specialistId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
  } catch {
    return [];
  }
}

function writeIds(specialistId: string, ids: string[]): void {
  if (typeof window === "undefined" || !specialistId.trim()) return;
  try {
    window.localStorage.setItem(
      storageKey(specialistId),
      JSON.stringify([...new Set(ids)].slice(0, 200))
    );
  } catch {
    /* quota / private mode */
  }
}

export function listHiddenInquiryIds(specialistId: string): string[] {
  return readIds(specialistId);
}

export function isInquiryHidden(
  specialistId: string,
  conversationId: string
): boolean {
  const id = conversationId.trim();
  if (!id) return false;
  return readIds(specialistId).includes(id);
}

export function hideInquiryId(
  specialistId: string,
  conversationId: string
): void {
  const id = conversationId.trim();
  if (!id) return;
  writeIds(specialistId, [...readIds(specialistId), id]);
}

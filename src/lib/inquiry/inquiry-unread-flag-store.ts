const UNREAD_FLAG_KEY_PREFIX = "smoac_unread_flag_inquiries_";

function storageKey(specialistId: string): string {
  return `${UNREAD_FLAG_KEY_PREFIX}${specialistId.trim()}`;
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

export function listFlaggedUnreadInquiryIds(specialistId: string): string[] {
  return readIds(specialistId);
}

export function isInquiryFlaggedUnread(
  specialistId: string,
  conversationId: string
): boolean {
  const id = conversationId.trim();
  if (!id) return false;
  return readIds(specialistId).includes(id);
}

/** Specialist-only “read later” — does not change the client’s unread state. */
export function flagInquiryUnread(
  specialistId: string,
  conversationId: string
): void {
  const id = conversationId.trim();
  if (!id) return;
  writeIds(specialistId, [...readIds(specialistId), id]);
}

export function flagInquiryUnreadIds(
  specialistId: string,
  conversationIds: readonly string[]
): void {
  const next = conversationIds
    .map((id) => id.trim())
    .filter(Boolean);
  if (next.length === 0) return;
  writeIds(specialistId, [...readIds(specialistId), ...next]);
}

export function unflagInquiryUnread(
  specialistId: string,
  conversationId: string
): void {
  const id = conversationId.trim();
  if (!id) return;
  writeIds(
    specialistId,
    readIds(specialistId).filter((item) => item !== id)
  );
}

export function unflagInquiryUnreadIds(
  specialistId: string,
  conversationIds: readonly string[]
): void {
  const remove = new Set(
    conversationIds.map((id) => id.trim()).filter(Boolean)
  );
  if (remove.size === 0) return;
  writeIds(
    specialistId,
    readIds(specialistId).filter((item) => !remove.has(item))
  );
}

export function applySpecialistUnreadFlags(
  specialistId: string,
  unread: boolean,
  conversationId: string
): boolean {
  return unread || isInquiryFlaggedUnread(specialistId, conversationId);
}

import { SPECIALIST_INQUIRY_NOTIFICATIONS_KEY } from "@/lib/dev-storage-keys";

export interface SpecialistInquiryNotification {
  id: string;
  specialistId: string;
  conversationId: string;
  clientFirstName: string;
  summary: string;
  createdAt: string;
  read: boolean;
}

function readAll(): SpecialistInquiryNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SPECIALIST_INQUIRY_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SpecialistInquiryNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: SpecialistInquiryNotification[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SPECIALIST_INQUIRY_NOTIFICATIONS_KEY,
    JSON.stringify(rows.slice(0, 50))
  );
  window.dispatchEvent(new Event("smoac:specialist-inquiry-notifications"));
}

export function pushSpecialistInquiryNotification(input: {
  specialistId: string;
  conversationId: string;
  clientFirstName: string;
  summary: string;
}): SpecialistInquiryNotification {
  const now = new Date().toISOString();
  const all = readAll().filter(
    (row) => row.conversationId !== input.conversationId || row.read
  );

  const notification: SpecialistInquiryNotification = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `inq-note-${Date.now()}`,
    specialistId: input.specialistId,
    conversationId: input.conversationId,
    clientFirstName: input.clientFirstName.trim() || "Client",
    summary: input.summary.trim() || "New inquiry",
    createdAt: now,
    read: false,
  };

  all.unshift(notification);
  writeAll(all);
  return notification;
}

export function listSpecialistInquiryNotifications(
  specialistId: string | null | undefined
): SpecialistInquiryNotification[] {
  if (!specialistId) return [];
  return readAll()
    .filter((row) => row.specialistId === specialistId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function countUnreadSpecialistInquiryNotifications(
  specialistId: string | null | undefined
): number {
  return listSpecialistInquiryNotifications(specialistId).filter((n) => !n.read)
    .length;
}

export function markSpecialistInquiryNotificationRead(
  specialistId: string,
  conversationId: string
): void {
  const all = readAll().map((row) =>
    row.specialistId === specialistId && row.conversationId === conversationId
      ? { ...row, read: true }
      : row
  );
  writeAll(all);
}

export function markAllSpecialistInquiryNotificationsRead(
  specialistId: string
): void {
  const all = readAll().map((row) =>
    row.specialistId === specialistId ? { ...row, read: true } : row
  );
  writeAll(all);
}

export function subscribeSpecialistInquiryNotifications(
  listener: () => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === SPECIALIST_INQUIRY_NOTIFICATIONS_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("smoac:specialist-inquiry-notifications", listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(
      "smoac:specialist-inquiry-notifications",
      listener
    );
  };
}

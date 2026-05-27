import { DEV_ADMIN_NOTIFICATION_DISMISSED_KEY } from "@/lib/dev-storage-keys";

const listeners = new Set<() => void>();

/** Stable empty snapshot for useSyncExternalStore */
const EMPTY_DISMISSED_IDS: readonly string[] = [];

let cachedIds: readonly string[] = EMPTY_DISMISSED_IDS;

function dismissedSignature(ids: readonly string[]): string {
  if (ids.length === 0) return "";
  return ids.join("|");
}

function readDismissedIds(): readonly string[] {
  if (typeof window === "undefined") return EMPTY_DISMISSED_IDS;
  try {
    const raw = window.localStorage.getItem(DEV_ADMIN_NOTIFICATION_DISMISSED_KEY);
    if (!raw) return EMPTY_DISMISSED_IDS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_DISMISSED_IDS;
    const filtered = parsed.filter((id): id is string => typeof id === "string");
    return filtered.length > 0 ? filtered : EMPTY_DISMISSED_IDS;
  } catch {
    return EMPTY_DISMISSED_IDS;
  }
}

function reloadCache(): readonly string[] {
  if (typeof window === "undefined") {
    return EMPTY_DISMISSED_IDS;
  }

  const loaded = readDismissedIds();
  const next: readonly string[] =
    loaded.length > 0 ? [...loaded] : EMPTY_DISMISSED_IDS;

  if (dismissedSignature(next) === dismissedSignature(cachedIds)) {
    return cachedIds;
  }

  cachedIds = next;
  return cachedIds;
}

function notify(): void {
  reloadCache();
  listeners.forEach((listener) => listener());
}

export function subscribeDismissedAdminNotifications(
  onStoreChange: () => void
): () => void {
  if (typeof window !== "undefined") {
    reloadCache();
  }
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getDismissedAdminNotificationsSnapshot(): readonly string[] {
  return reloadCache();
}

export function getDismissedAdminNotificationsServerSnapshot(): readonly string[] {
  return EMPTY_DISMISSED_IDS;
}

export function getDismissedAdminNotificationSet(): ReadonlySet<string> {
  return new Set(getDismissedAdminNotificationsSnapshot());
}

/** Owner dismissed a mock alert — Supabase `dismissed_at` later */
export function dismissAdminNotificationIssue(issueId: string): void {
  if (typeof window === "undefined") return;
  const current = new Set(getDismissedAdminNotificationsSnapshot());
  if (current.has(issueId)) return;
  current.add(issueId);
  try {
    window.localStorage.setItem(
      DEV_ADMIN_NOTIFICATION_DISMISSED_KEY,
      JSON.stringify([...current])
    );
    notify();
  } catch {
    /* ignore */
  }
}

export function clearDismissedAdminNotifications(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DEV_ADMIN_NOTIFICATION_DISMISSED_KEY);
    notify();
  } catch {
    /* ignore */
  }
}

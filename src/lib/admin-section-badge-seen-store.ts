import { DEV_ADMIN_SECTION_BADGE_SEEN_KEY } from "@/lib/dev-storage-keys";
import type { AdminNotifiableSectionId } from "@/types/admin-notifications";

const listeners = new Set<() => void>();

type SeenMap = Partial<Record<AdminNotifiableSectionId, readonly string[]>>;

const EMPTY_SEEN: SeenMap = {};
let cachedSeen: SeenMap = EMPTY_SEEN;

function signature(map: SeenMap): string {
  return (Object.keys(map) as AdminNotifiableSectionId[])
    .sort()
    .map((key) => `${key}:${(map[key] ?? []).slice().sort().join(",")}`)
    .join("|");
}

function readSeen(): SeenMap {
  if (typeof window === "undefined") return EMPTY_SEEN;
  try {
    const raw = window.localStorage.getItem(DEV_ADMIN_SECTION_BADGE_SEEN_KEY);
    if (!raw) return EMPTY_SEEN;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return EMPTY_SEEN;
    const next: SeenMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (
        key === "applications" ||
        key === "specialists" ||
        key === "clients" ||
        key === "revenue"
      ) {
        if (Array.isArray(value)) {
          next[key] = value.filter((id): id is string => typeof id === "string");
        }
      }
    }
    return Object.keys(next).length > 0 ? next : EMPTY_SEEN;
  } catch {
    return EMPTY_SEEN;
  }
}

function reloadCache(): SeenMap {
  if (typeof window === "undefined") return EMPTY_SEEN;
  const loaded = readSeen();
  if (signature(loaded) === signature(cachedSeen)) return cachedSeen;
  cachedSeen = loaded;
  return cachedSeen;
}

function notify(): void {
  reloadCache();
  listeners.forEach((listener) => listener());
}

export function subscribeAdminSectionBadgeSeen(
  onStoreChange: () => void
): () => void {
  if (typeof window !== "undefined") reloadCache();
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getAdminSectionBadgeSeenSnapshot(): SeenMap {
  return reloadCache();
}

export function getAdminSectionBadgeSeenServerSnapshot(): SeenMap {
  return EMPTY_SEEN;
}

export function getSeenIdsForAdminSection(
  section: AdminNotifiableSectionId
): ReadonlySet<string> {
  return new Set(getAdminSectionBadgeSeenSnapshot()[section] ?? []);
}

/**
 * Mark the current attention item IDs for a section as viewed.
 * Badge clears until new item IDs appear.
 */
export function markAdminSectionBadgeSeen(
  section: AdminNotifiableSectionId,
  itemIds: readonly string[]
): void {
  if (typeof window === "undefined") return;
  const current = { ...getAdminSectionBadgeSeenSnapshot() };
  const nextIds = [...new Set(itemIds)].sort();
  const prev = current[section] ?? [];
  if (
    prev.length === nextIds.length &&
    prev.every((id, i) => id === nextIds[i])
  ) {
    return;
  }
  current[section] = nextIds;
  try {
    window.localStorage.setItem(
      DEV_ADMIN_SECTION_BADGE_SEEN_KEY,
      JSON.stringify(current)
    );
    notify();
  } catch {
    /* ignore */
  }
}

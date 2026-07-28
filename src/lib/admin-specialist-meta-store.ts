import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { DEV_ADMIN_SPECIALIST_META_KEY } from "@/lib/dev-storage-keys";
import type { AdminSpecialistMeta } from "@/types/admin";

type MetaMap = Record<string, AdminSpecialistMeta>;

const EMPTY: MetaMap = {};
let cached: MetaMap = EMPTY;
let hasHydratedMemory = false;
const listeners = new Set<() => void>();

function mapKey(map: MetaMap): string {
  return JSON.stringify(map);
}

function readStorage(): MetaMap {
  if (typeof window === "undefined") return EMPTY;
  /* Live: durable flags come from specialist_profiles — ops-only fields stay memory */
  if (isMarketplaceSupabaseActive()) return EMPTY;
  try {
    const raw = window.localStorage.getItem(DEV_ADMIN_SPECIALIST_META_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as MetaMap;
    return parsed && typeof parsed === "object" ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

function persist(map: MetaMap): void {
  if (typeof window === "undefined") return;
  if (isMarketplaceSupabaseActive()) return;
  try {
    window.localStorage.setItem(DEV_ADMIN_SPECIALIST_META_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function readCache(): MetaMap {
  if (typeof window === "undefined") return EMPTY;
  if (!hasHydratedMemory) {
    hasHydratedMemory = true;
    if (!isMarketplaceSupabaseActive()) {
      const loaded = readStorage();
      cached = Object.keys(loaded).length > 0 ? { ...loaded } : EMPTY;
    }
  }
  return cached;
}

export function subscribeAdminSpecialistMeta(onStoreChange: () => void): () => void {
  if (typeof window !== "undefined") readCache();
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getAdminSpecialistMetaSnapshot(): MetaMap {
  return readCache();
}

export function getAdminSpecialistMetaServerSnapshot(): MetaMap {
  return EMPTY;
}

const EMPTY_META: AdminSpecialistMeta = {};

export function getAdminSpecialistMeta(trainerId: string): AdminSpecialistMeta {
  return readCache()[trainerId] ?? EMPTY_META;
}

function emit(map: MetaMap): void {
  cached = Object.keys(map).length > 0 ? { ...map } : EMPTY;
  hasHydratedMemory = true;
  persist(cached);
  listeners.forEach((listener) => listener());
}

export function patchAdminSpecialistMeta(
  trainerId: string,
  patch: Partial<AdminSpecialistMeta>
): void {
  const current = readCache();
  const next = {
    ...current,
    [trainerId]: { ...current[trainerId], ...patch },
  };
  if (mapKey(next) === mapKey(current)) return;
  emit(next);
}

/** Bulk-merge durable flags from remote specialist_profiles into local meta. */
export function mergeAdminSpecialistMetaFromRemote(
  entries: Array<{
    id: string;
    visibility?: AdminSpecialistMeta["visibility"];
    featured?: boolean;
    sponsored?: boolean;
    topRanked?: boolean;
    isPremium?: boolean;
  }>
): void {
  if (entries.length === 0) return;
  const current = { ...readCache() };
  let changed = false;
  for (const entry of entries) {
    const prev = current[entry.id] ?? {};
    const nextMeta: AdminSpecialistMeta = {
      ...prev,
      ...(entry.visibility != null ? { visibility: entry.visibility } : {}),
      ...(typeof entry.featured === "boolean" ? { featured: entry.featured } : {}),
      ...(typeof entry.sponsored === "boolean"
        ? { sponsored: entry.sponsored }
        : {}),
      ...(typeof entry.topRanked === "boolean"
        ? { topRanked: entry.topRanked }
        : {}),
      ...(typeof entry.isPremium === "boolean"
        ? { isPremium: entry.isPremium }
        : {}),
    };
    if (mapKey({ [entry.id]: nextMeta }) !== mapKey({ [entry.id]: prev })) {
      current[entry.id] = nextMeta;
      changed = true;
    }
  }
  if (changed) emit(current);
}

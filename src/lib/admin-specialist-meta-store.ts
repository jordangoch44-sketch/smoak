import { DEV_ADMIN_SPECIALIST_META_KEY } from "@/lib/dev-storage-keys";
import type { AdminSpecialistMeta } from "@/types/admin";

type MetaMap = Record<string, AdminSpecialistMeta>;

const EMPTY: MetaMap = {};
let cached: MetaMap = EMPTY;
const listeners = new Set<() => void>();

function mapKey(map: MetaMap): string {
  return JSON.stringify(map);
}

function readStorage(): MetaMap {
  if (typeof window === "undefined") return EMPTY;
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
  try {
    window.localStorage.setItem(DEV_ADMIN_SPECIALIST_META_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function readCache(): MetaMap {
  if (typeof window === "undefined") return EMPTY;
  if (cached === EMPTY && Object.keys(cached).length === 0) {
    const loaded = readStorage();
    cached = Object.keys(loaded).length > 0 ? { ...loaded } : EMPTY;
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

import { DEV_APPROVED_SPECIALIST_PROFILES_KEY } from "@/lib/dev-storage-keys";
import type { Trainer } from "@/types/trainer";

const listeners = new Set<() => void>();
const EMPTY_SNAPSHOT: Record<string, Trainer> = Object.freeze({});

let cachedProfiles: Record<string, Trainer> | undefined;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readCache(): Record<string, Trainer> {
  if (typeof window === "undefined") {
    return EMPTY_SNAPSHOT;
  }
  if (cachedProfiles === undefined) {
    const loaded = safeParse<Record<string, Trainer>>(
      window.localStorage.getItem(DEV_APPROVED_SPECIALIST_PROFILES_KEY),
      {}
    );
    cachedProfiles =
      Object.keys(loaded).length > 0 ? loaded : EMPTY_SNAPSHOT;
  }
  return cachedProfiles;
}

function persist(profiles: Record<string, Trainer>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DEV_APPROVED_SPECIALIST_PROFILES_KEY,
      JSON.stringify(profiles)
    );
    cachedProfiles = profiles;
    listeners.forEach((listener) => listener());
  } catch {
    /* ignore */
  }
}

export function subscribeApprovedSpecialistProfiles(
  onStoreChange: () => void
): () => void {
  if (typeof window !== "undefined") {
    readCache();
  }
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getApprovedSpecialistProfilesSnapshot(): Record<string, Trainer> {
  return readCache();
}

export function getApprovedSpecialistProfilesServerSnapshot(): Record<
  string,
  Trainer
> {
  return EMPTY_SNAPSHOT;
}

export function getApprovedSpecialistProfileById(
  id: string
): Trainer | undefined {
  return readCache()[id];
}

export function saveApprovedSpecialistProfile(trainer: Trainer): void {
  const next = { ...readCache(), [trainer.id]: trainer };
  persist(next);
}

export function removeApprovedSpecialistProfile(id: string): void {
  const current = { ...readCache() };
  if (!(id in current)) return;
  delete current[id];
  persist(current);
}

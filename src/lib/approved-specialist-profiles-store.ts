import {
  fetchApprovedSpecialistProfiles,
  importLocalSpecialistProfiles,
  setSpecialistProfileStatus,
  upsertSpecialistProfile,
} from "@/lib/profiles/specialist-profiles-db";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { DEV_APPROVED_SPECIALIST_PROFILES_KEY } from "@/lib/dev-storage-keys";
import { getSpecialistApplicationById } from "@/lib/specialist-application-storage";
import {
  loadAllSpecialistOverrides,
  loadSpecialistOverridesForId,
  saveSpecialistOverridesForId,
} from "@/lib/specialist-profile-overrides";
import type { SpecialistProfileOverrides } from "@/types/specialist-profile-edit";
import type { Trainer } from "@/types/trainer";

const listeners = new Set<() => void>();
const EMPTY_SNAPSHOT: Record<string, Trainer> = Object.freeze({});

let cachedProfiles: Record<string, Trainer> = EMPTY_SNAPSHOT;
let hydrated = false;
let hydrating = false;
let loadGeneration = 0;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readLocalProfiles(): Record<string, Trainer> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, Trainer>>(
    window.localStorage.getItem(DEV_APPROVED_SPECIALIST_PROFILES_KEY),
    {}
  );
}

function writeLocalProfiles(profiles: Record<string, Trainer>): void {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(profiles).length === 0) {
      window.localStorage.removeItem(DEV_APPROVED_SPECIALIST_PROFILES_KEY);
    } else {
      window.localStorage.setItem(
        DEV_APPROVED_SPECIALIST_PROFILES_KEY,
        JSON.stringify(profiles)
      );
    }
  } catch {
    /* ignore */
  }
}

function profilesSignature(profiles: Record<string, Trainer>): string {
  return Object.keys(profiles)
    .sort()
    .map((id) => `${id}:${profiles[id]?.name ?? ""}:${profiles[id]?.pricePerSession ?? 0}`)
    .join("|");
}

function applyCache(profiles: Record<string, Trainer>): void {
  const next =
    Object.keys(profiles).length > 0
      ? { ...profiles }
      : (EMPTY_SNAPSHOT as Record<string, Trainer>);
  if (profilesSignature(next) === profilesSignature(cachedProfiles)) {
    return;
  }
  cachedProfiles = next;
  listeners.forEach((listener) => listener());
}

function markHydratedAndNotify(): void {
  const wasHydrated = hydrated;
  hydrated = true;
  if (!wasHydrated) {
    listeners.forEach((listener) => listener());
  }
}

function mergeOverridesIntoLocalStore(
  overridesById: Record<string, SpecialistProfileOverrides>
): void {
  for (const [id, overrides] of Object.entries(overridesById)) {
    if (!overrides || Object.keys(overrides).length === 0) continue;
    const existing = loadSpecialistOverridesForId(id) ?? {};
    saveSpecialistOverridesForId(id, { ...existing, ...overrides });
  }
}

async function hydrateFromSupabase(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isMarketplaceSupabaseActive()) {
    applyCache(readLocalProfiles());
    markHydratedAndNotify();
    return;
  }
  if (hydrating) return;

  const generation = ++loadGeneration;
  hydrating = true;
  const supabase = getMarketplaceAuthClient();

  try {
    if (!supabase) {
      applyCache(readLocalProfiles());
      markHydratedAndNotify();
      return;
    }

    const local = readLocalProfiles();
    const localOverrides = loadAllSpecialistOverrides();
    const result =
      Object.keys(local).length > 0
        ? await importLocalSpecialistProfiles(supabase, local, localOverrides)
        : await fetchApprovedSpecialistProfiles(supabase);

    if (generation !== loadGeneration) return;

    if (!result.ok) {
      console.warn(
        "[SMOAC profiles] specialist_profiles hydrate failed:",
        result.message
      );
      applyCache(local);
      markHydratedAndNotify();
      return;
    }

    const next: Record<string, Trainer> = {};
    for (const trainer of result.profiles) {
      next[trainer.id] = trainer;
    }
    applyCache(next);
    writeLocalProfiles(next);
    mergeOverridesIntoLocalStore(result.overridesById);
    markHydratedAndNotify();
  } finally {
    if (generation === loadGeneration) {
      hydrating = false;
    }
  }
}

function ensureHydrated(): void {
  if (hydrated || hydrating) return;
  void hydrateFromSupabase();
}

function resolveUserIdForProfile(trainerId: string): string | null {
  const app = getSpecialistApplicationById(trainerId);
  if (app?.userId?.trim()) return app.userId.trim();
  /* Never fall back to the acting admin session — that misattributes ownership */
  return null;
}

function persistRemoteApproved(
  trainer: Trainer,
  overrides?: SpecialistProfileOverrides | null
): void {
  if (!isMarketplaceSupabaseActive()) return;
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return;

  void upsertSpecialistProfile(supabase, {
    trainer,
    overrides: overrides ?? loadSpecialistOverridesForId(trainer.id) ?? {},
    userId: resolveUserIdForProfile(trainer.id),
    applicationId: getSpecialistApplicationById(trainer.id)?.id ?? null,
    status: "approved",
  }).then((result) => {
    if (!result.ok) {
      console.warn(
        "[SMOAC profiles] specialist_profiles upsert failed:",
        result.message
      );
    }
  });
}

function persistRemoteStatus(
  id: string,
  status: "approved" | "hidden" | "archived"
): void {
  if (!isMarketplaceSupabaseActive()) return;
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return;

  void setSpecialistProfileStatus(supabase, id, status).then((result) => {
    if (!result.ok) {
      console.warn(
        "[SMOAC profiles] specialist_profiles status update failed:",
        result.message
      );
    }
  });
}

export function subscribeApprovedSpecialistProfiles(
  onStoreChange: () => void
): () => void {
  if (typeof window !== "undefined") {
    ensureHydrated();
    if (!hydrated && !isMarketplaceSupabaseActive()) {
      applyCache(readLocalProfiles());
      hydrated = true;
    }
  }
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getApprovedSpecialistProfilesSnapshot(): Record<string, Trainer> {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;
  ensureHydrated();
  if (!hydrated && cachedProfiles === EMPTY_SNAPSHOT) {
    return readLocalProfiles();
  }
  return cachedProfiles;
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
  return getApprovedSpecialistProfilesSnapshot()[id];
}

export function saveApprovedSpecialistProfile(trainer: Trainer): void {
  const next = {
    ...getApprovedSpecialistProfilesSnapshot(),
    [trainer.id]: trainer,
  };
  applyCache(next);
  writeLocalProfiles(next);
  persistRemoteApproved(trainer);
}

export function removeApprovedSpecialistProfile(id: string): void {
  const current = { ...getApprovedSpecialistProfilesSnapshot() };
  if (!(id in current)) {
    persistRemoteStatus(id, "archived");
    return;
  }
  delete current[id];
  applyCache(current);
  writeLocalProfiles(current);
  persistRemoteStatus(id, "archived");
}

/** Soft-remove from public catalog without deleting the row. */
export function hideApprovedSpecialistProfile(id: string): void {
  const current = { ...getApprovedSpecialistProfilesSnapshot() };
  if (id in current) {
    delete current[id];
    applyCache(current);
    writeLocalProfiles(current);
  }
  persistRemoteStatus(id, "hidden");
}

export function refreshApprovedSpecialistProfilesFromRemote(): void {
  hydrated = false;
  void hydrateFromSupabase();
}

/** True after first local or Supabase catalog hydrate finishes (client). */
export function getApprovedSpecialistProfilesHydratedSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  ensureHydrated();
  return hydrated;
}

export function getApprovedSpecialistProfilesHydratedServerSnapshot(): boolean {
  return false;
}


import {
  fetchApprovedSpecialistProfiles,
  setSpecialistProfileStatus,
  upsertSpecialistProfile,
} from "@/lib/profiles/specialist-profiles-db";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { DEV_APPROVED_SPECIALIST_PROFILES_KEY } from "@/lib/dev-storage-keys";
import {
  getPublicCatalogMode,
  isLivePublicCatalogMode,
  setPublicCatalogMode,
  type PublicCatalogMode,
} from "@/lib/public-catalog-mode";
import { getSpecialistApplicationById } from "@/lib/specialist-application-storage";
import {
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
    setPublicCatalogMode("seed");
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
      setPublicCatalogMode("seed");
      markHydratedAndNotify();
      return;
    }

    const local = readLocalProfiles();
    const result = await fetchApprovedSpecialistProfiles(supabase);

    if (generation !== loadGeneration) return;

    if (!result.ok) {
      console.warn(
        "[SMOAC profiles] specialist_profiles hydrate failed:",
        result.message
      );
      /* Keep SSR prime / existing cache — never push localStorage into the DB */
      if (cachedProfiles === EMPTY_SNAPSHOT && !isLivePublicCatalogMode()) {
        applyCache(local);
      }
      setPublicCatalogMode("live");
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
    setPublicCatalogMode("live");
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
  void persistRemoteApprovedAsync(trainer, overrides);
}

async function persistRemoteApprovedAsync(
  trainer: Trainer,
  overrides?: SpecialistProfileOverrides | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isMarketplaceSupabaseActive()) return { ok: true };
  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  const result = await upsertSpecialistProfile(supabase, {
    trainer,
    overrides: overrides ?? loadSpecialistOverridesForId(trainer.id) ?? {},
    userId: resolveUserIdForProfile(trainer.id),
    applicationId: getSpecialistApplicationById(trainer.id)?.id ?? null,
    status: "approved",
  });

  if (!result.ok) {
    console.warn(
      "[SMOAC profiles] specialist_profiles upsert failed:",
      result.message
    );
  }
  return result;
}

async function persistRemoteStatusAsync(
  id: string,
  status: "approved" | "hidden" | "archived"
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isMarketplaceSupabaseActive()) return { ok: true };
  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  const result = await setSpecialistProfileStatus(supabase, id, status);
  if (!result.ok) {
    console.warn(
      "[SMOAC profiles] specialist_profiles status update failed:",
      result.message
    );
    return result;
  }
  await refreshApprovedSpecialistProfilesFromRemoteAsync();
  return { ok: true };
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
  /* useSyncExternalStore requires stable identity — never return a fresh
   * parse from localStorage on every getSnapshot call. */
  if (!hydrated && cachedProfiles === EMPTY_SNAPSHOT) {
    /* Live mode: do not invent catalog from stale localStorage before remote hydrate */
    if (isLivePublicCatalogMode(getPublicCatalogMode()) || isMarketplaceSupabaseActive()) {
      return EMPTY_SNAPSHOT;
    }
    const local = readLocalProfiles();
    cachedProfiles =
      Object.keys(local).length > 0 ? local : EMPTY_SNAPSHOT;
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

/** Await remote upsert (admin approve/activate) then refresh from Supabase. */
export async function saveApprovedSpecialistProfileAsync(
  trainer: Trainer
): Promise<{ ok: true } | { ok: false; message: string }> {
  const next = {
    ...getApprovedSpecialistProfilesSnapshot(),
    [trainer.id]: trainer,
  };
  applyCache(next);
  writeLocalProfiles(next);
  const result = await persistRemoteApprovedAsync(trainer);
  if (result.ok) {
    await refreshApprovedSpecialistProfilesFromRemoteAsync();
  }
  return result;
}

/**
 * Prime client cache from SSR catalog so Explore/home match server HTML
 * before async hydrate finishes. Sets catalog mode. Does not mark hydrated.
 */
export function primeApprovedSpecialistProfilesCache(
  trainers: Trainer[],
  mode: PublicCatalogMode = "live"
): void {
  if (typeof window === "undefined") return;
  setPublicCatalogMode(mode === "unknown" ? "live" : mode);

  if (hydrated) return;

  if (mode === "seed") {
    return;
  }

  const next: Record<string, Trainer> = {};
  for (const trainer of trainers) {
    next[trainer.id] = trainer;
  }
  applyCache(next);
}

/** Shared SSR handoff for Explore / home rails (seed vs live). */
export function primePublicCatalogFromSSR(
  trainers: Trainer[] | undefined,
  mode: PublicCatalogMode = "live"
): void {
  if (mode === "seed") {
    primeApprovedSpecialistProfilesCache([], "seed");
    return;
  }
  primeApprovedSpecialistProfilesCache(trainers ?? [], mode);
}

export function removeApprovedSpecialistProfile(id: string): void {
  void removeApprovedSpecialistProfileAsync(id);
}

export async function removeApprovedSpecialistProfileAsync(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const current = { ...getApprovedSpecialistProfilesSnapshot() };
  if (id in current) {
    delete current[id];
    applyCache(current);
    writeLocalProfiles(current);
  }
  return persistRemoteStatusAsync(id, "archived");
}

/** Soft-remove from public catalog without deleting the row. */
export function hideApprovedSpecialistProfile(id: string): void {
  void hideApprovedSpecialistProfileAsync(id);
}

export async function hideApprovedSpecialistProfileAsync(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const current = { ...getApprovedSpecialistProfilesSnapshot() };
  if (id in current) {
    delete current[id];
    applyCache(current);
    writeLocalProfiles(current);
  }
  return persistRemoteStatusAsync(id, "hidden");
}

/** Restore a hidden listing to the public approved catalog. */
export async function restoreApprovedSpecialistProfileAsync(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  return persistRemoteStatusAsync(id, "approved");
}

export function refreshApprovedSpecialistProfilesFromRemote(): void {
  hydrated = false;
  void hydrateFromSupabase();
}

export async function refreshApprovedSpecialistProfilesFromRemoteAsync(): Promise<void> {
  hydrated = false;
  await hydrateFromSupabase();
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


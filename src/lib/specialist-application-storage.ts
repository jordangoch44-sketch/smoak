import { uploadApplicationMediaToStorage } from "@/lib/applications/application-media-upload";
import {
  fetchSpecialistApplications,
  pickPreferredSpecialistApplication,
  upsertSpecialistApplication,
} from "@/lib/applications/specialist-applications-db";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { getAuthSessionSnapshot } from "@/lib/auth-session-store";
import {
  DEV_SPECIALIST_APPLICATIONS_KEY,
  DEV_SPECIALIST_ONBOARDING_DRAFT_KEY,
} from "@/lib/dev-storage-keys";
import {
  enrichSpecialistApplicationFields,
  normalizeSpecialistApplicationShape,
} from "@/lib/specialist-application-fields";
import {
  INITIAL_SPECIALIST_ONBOARDING_STATE,
  type SpecialistApplication,
  type SpecialistOnboardingState,
} from "@/types/specialist-application";

function normalizeApplication(app: SpecialistApplication): SpecialistApplication {
  const shaped = normalizeSpecialistApplicationShape(app);
  return enrichSpecialistApplicationFields(shaped) as SpecialistApplication;
}

const applicationListeners = new Set<() => void>();
const EMPTY_APPLICATIONS: readonly SpecialistApplication[] = [];

let cachedApplications: readonly SpecialistApplication[] = EMPTY_APPLICATIONS;
let hydrated = false;
let hydrating = false;
let loadGeneration = 0;

function applicationsSignature(apps: readonly SpecialistApplication[]): string {
  if (apps.length === 0) return "";
  return apps
    .map((a) => `${a.id}:${a.profileStatus}:${a.updatedAt}`)
    .join("|");
}

function applicationTimestamp(app: SpecialistApplication): number {
  const parsed = Date.parse(app.updatedAt || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Prefer the freshest copy when remote hydrate races a just-saved edit. */
function mergeRemoteApplications(
  remote: readonly SpecialistApplication[],
  local: readonly SpecialistApplication[]
): SpecialistApplication[] {
  if (local.length === 0) return [...remote];
  const localById = new Map(local.map((app) => [app.id, app]));
  const merged = remote.map((remoteApp) => {
    const localApp = localById.get(remoteApp.id);
    if (!localApp) return remoteApp;
    return applicationTimestamp(localApp) > applicationTimestamp(remoteApp)
      ? localApp
      : remoteApp;
  });
  return merged;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readLocalApplications(): SpecialistApplication[] {
  if (typeof window === "undefined") return [];
  return safeParse<SpecialistApplication[]>(
    window.localStorage.getItem(DEV_SPECIALIST_APPLICATIONS_KEY),
    []
  ).map(normalizeApplication);
}

function writeLocalApplications(apps: readonly SpecialistApplication[]): void {
  if (typeof window === "undefined") return;
  if (isMarketplaceSupabaseActive()) return;
  try {
    const sanitized = apps.map((app) => ({ ...app, password: "" }));
    if (sanitized.length === 0) {
      window.localStorage.removeItem(DEV_SPECIALIST_APPLICATIONS_KEY);
    } else {
      window.localStorage.setItem(
        DEV_SPECIALIST_APPLICATIONS_KEY,
        JSON.stringify(sanitized)
      );
    }
  } catch {
    /* ignore */
  }
}

function applyCache(apps: readonly SpecialistApplication[]): void {
  const next: readonly SpecialistApplication[] =
    apps.length > 0 ? apps.map(normalizeApplication) : EMPTY_APPLICATIONS;
  if (applicationsSignature(next) === applicationsSignature(cachedApplications)) {
    return;
  }
  cachedApplications = next;
  applicationListeners.forEach((listener) => listener());
}

function withSessionUserId(
  application: SpecialistApplication
): SpecialistApplication {
  if (application.userId) return application;
  const session = getAuthSessionSnapshot();
  if (!session?.userId) return application;
  return { ...application, userId: session.userId };
}

async function hydrateFromSupabase(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isMarketplaceSupabaseActive()) {
    applyCache(readLocalApplications());
    hydrated = true;
    return;
  }
  if (hydrating) return;

  const generation = ++loadGeneration;
  hydrating = true;
  const HYDRATE_MS = 12_000;
  const timeoutId = window.setTimeout(() => {
    if (generation !== loadGeneration || hydrated) return;
    hydrated = true;
    hydrating = false;
    applicationListeners.forEach((listener) => listener());
  }, HYDRATE_MS);

  const supabase = getMarketplaceAuthClient();
  try {
    if (!supabase) {
      /* Live mode: empty until remote — never promote stale localStorage */
      applyCache([]);
      hydrated = true;
      return;
    }

    const result = await fetchSpecialistApplications(supabase);

    if (generation !== loadGeneration) return;

    if (!result.ok) {
      console.warn(
        "[SMOAC applications] specialist hydrate failed:",
        result.message
      );
      /* Keep memory cache — do not invent queue from stale localStorage */
      hydrated = true;
      return;
    }

    applyCache(mergeRemoteApplications(result.applications, cachedApplications));
    writeLocalApplications(cachedApplications);
    hydrated = true;
  } finally {
    window.clearTimeout(timeoutId);
    if (generation === loadGeneration) {
      hydrating = false;
    }
  }
}

function ensureHydrated(): void {
  if (hydrated || hydrating) return;
  /* Wait for an app session so this fetch does not race / timeout login. */
  if (isMarketplaceSupabaseActive() && !getAuthSessionSnapshot()) return;
  void hydrateFromSupabase();
}

export function ensureSpecialistApplicationsHydrated(): void {
  if (typeof window === "undefined") return;
  ensureHydrated();
}

export function subscribeSpecialistApplications(
  onStoreChange: () => void
): () => void {
  if (typeof window !== "undefined") {
    ensureHydrated();
    if (!hydrated && !isMarketplaceSupabaseActive()) {
      applyCache(readLocalApplications());
      hydrated = true;
    }
  }
  applicationListeners.add(onStoreChange);
  return () => applicationListeners.delete(onStoreChange);
}

export function getSpecialistApplicationsSnapshot(): readonly SpecialistApplication[] {
  if (typeof window === "undefined") return EMPTY_APPLICATIONS;
  ensureHydrated();
  /* Offline/dev only: seed from localStorage before hydrate completes.
   * Live Supabase mode waits for remote (empty until then). */
  if (
    !hydrated &&
    cachedApplications === EMPTY_APPLICATIONS &&
    !isMarketplaceSupabaseActive()
  ) {
    const local = readLocalApplications();
    cachedApplications = local.length > 0 ? local : EMPTY_APPLICATIONS;
  }
  return cachedApplications;
}

export function getSpecialistApplicationsServerSnapshot(): readonly SpecialistApplication[] {
  return EMPTY_APPLICATIONS;
}

/** True after first local or Supabase applications hydrate finishes (client). */
export function getSpecialistApplicationsHydratedSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  ensureHydrated();
  return hydrated;
}

export function getSpecialistApplicationsHydratedServerSnapshot(): boolean {
  return false;
}

/** DEV ONLY — autosave draft between onboarding steps (stays local until submit) */
export function persistSpecialistOnboardingDraft(
  state: SpecialistOnboardingState
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DEV_SPECIALIST_ONBOARDING_DRAFT_KEY,
      JSON.stringify({ ...state, savedAt: new Date().toISOString() })
    );
  } catch {
    /* ignore */
  }
}

export function loadSpecialistOnboardingDraft(): SpecialistOnboardingState | null {
  if (typeof window === "undefined") return null;
  const parsed = safeParse<
    SpecialistOnboardingState & { savedAt?: string }
  >(window.localStorage.getItem(DEV_SPECIALIST_ONBOARDING_DRAFT_KEY), {
    ...INITIAL_SPECIALIST_ONBOARDING_STATE,
  });
  if (!parsed || typeof parsed !== "object") return null;
  return {
    ...INITIAL_SPECIALIST_ONBOARDING_STATE,
    ...parsed,
    pricing: { ...INITIAL_SPECIALIST_ONBOARDING_STATE.pricing, ...parsed.pricing },
    availability: {
      ...INITIAL_SPECIALIST_ONBOARDING_STATE.availability,
      ...parsed.availability,
    },
    social: { ...INITIAL_SPECIALIST_ONBOARDING_STATE.social, ...parsed.social },
    media: { ...INITIAL_SPECIALIST_ONBOARDING_STATE.media, ...parsed.media },
  };
}

export function clearSpecialistOnboardingDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DEV_SPECIALIST_ONBOARDING_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function listSpecialistApplications(): readonly SpecialistApplication[] {
  return getSpecialistApplicationsSnapshot();
}

function cacheApplication(app: SpecialistApplication): void {
  const next = [
    app,
    ...listSpecialistApplications().filter((item) => item.id !== app.id),
  ];
  applyCache(next);
  writeLocalApplications(next);
}

export function saveSpecialistApplication(
  application: SpecialistApplication
): void {
  if (typeof window === "undefined") return;
  const nextApp = withSessionUserId({ ...application, password: "" });
  cacheApplication(nextApp);

  if (!isMarketplaceSupabaseActive()) return;
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return;
  void uploadApplicationMediaToStorage(nextApp)
    .then((prepared) => {
      if (!prepared.ok) return prepared;
      if (prepared.application !== nextApp) {
        cacheApplication(prepared.application);
      }
      return upsertSpecialistApplication(supabase, prepared.application);
    })
    .then((result) => {
      if (!result.ok) {
        console.warn(
          "[SMOAC applications] specialist upsert failed:",
          result.message
        );
      }
    });
}

export type SpecialistApplicationSaveResult =
  | { ok: true; application: SpecialistApplication }
  | { ok: false; message: string };

export async function saveSpecialistApplicationAsync(
  application: SpecialistApplication
): Promise<SpecialistApplicationSaveResult> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Unavailable on server" };
  }
  const nextApp = withSessionUserId({ ...application, password: "" });

  if (!isMarketplaceSupabaseActive()) {
    cacheApplication(nextApp);
    return { ok: true, application: nextApp };
  }
  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication client unavailable" };
  }

  /* Move inline photos to storage first — huge base64 blobs in
   * application_data time out the Postgres upsert. */
  const prepared = await uploadApplicationMediaToStorage(nextApp);
  if (!prepared.ok) {
    return prepared;
  }

  const result = await upsertSpecialistApplication(
    supabase,
    prepared.application
  );
  if (!result.ok) return result;

  /* Only cache after the remote write succeeds so admin/hydrate stay truthful. */
  cacheApplication(prepared.application);
  return { ok: true, application: prepared.application };
}

export function getSpecialistApplicationById(
  id: string
): SpecialistApplication | null {
  return listSpecialistApplications().find((item) => item.id === id) ?? null;
}

export function findSpecialistApplicationByEmail(
  email: string
): SpecialistApplication | null {
  const normalized = email.trim().toLowerCase();
  const matches = listSpecialistApplications().filter(
    (item) => item.email.trim().toLowerCase() === normalized
  );
  return pickPreferredSpecialistApplication(matches);
}

export function findSpecialistApplicationByUserId(
  userId: string
): SpecialistApplication | null {
  const normalized = userId.trim();
  if (!normalized) return null;
  const matches = listSpecialistApplications().filter(
    (item) => item.userId?.trim() === normalized
  );
  return pickPreferredSpecialistApplication(matches);
}

/** Drop an application from the in-memory snapshot (and local mirror). */
export function removeSpecialistApplicationLocal(id: string): void {
  const trimmed = id.trim();
  if (!trimmed) return;
  const next = listSpecialistApplications().filter((item) => item.id !== trimmed);
  applyCache(next);
  writeLocalApplications(next);
}

export async function deleteSpecialistApplicationAsync(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Unavailable on server" };
  }
  const trimmed = id.trim();
  if (!trimmed) {
    return { ok: false, message: "Application id is required." };
  }

  if (!isMarketplaceSupabaseActive()) {
    removeSpecialistApplicationLocal(trimmed);
    return { ok: true };
  }

  try {
    const response = await fetch("/api/admin/specialist-applications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ applicationId: trimmed }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
    } | null;
    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        message: payload?.message || "Could not delete application.",
      };
    }
  } catch {
    return { ok: false, message: "Network error deleting application." };
  }

  removeSpecialistApplicationLocal(trimmed);
  return { ok: true };
}

/**
 * Reject / archive deny: remove application(s), catalog profile, and Auth user
 * so the email can be reused on a fresh specialist signup.
 */
export async function purgeSpecialistApplicationAccountAsync(
  application: Pick<SpecialistApplication, "id" | "email" | "userId">
): Promise<
  | { ok: true; authDeleted: boolean; deletedIds: string[] }
  | { ok: false; message: string }
> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Unavailable on server" };
  }
  const trimmed = application.id.trim();
  if (!trimmed) {
    return { ok: false, message: "Application id is required." };
  }

  if (!isMarketplaceSupabaseActive()) {
    const email = application.email.trim().toLowerCase();
    const userId = application.userId?.trim() || "";
    const deletedIds: string[] = [];
    for (const app of listSpecialistApplications()) {
      const sameId = app.id === trimmed;
      const sameEmail = email && app.email.trim().toLowerCase() === email;
      const sameUser = userId && app.userId?.trim() === userId;
      if (sameId || sameEmail || sameUser) {
        removeSpecialistApplicationLocal(app.id);
        deletedIds.push(app.id);
      }
    }
    return { ok: true, authDeleted: true, deletedIds };
  }

  try {
    const response = await fetch("/api/admin/specialist-applications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        applicationId: trimmed,
        purgeAccount: true,
        deleteAuthUser: true,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      deletedIds?: string[];
      authDeleted?: boolean;
    } | null;
    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        message: payload?.message || "Could not remove specialist account.",
      };
    }
    for (const id of payload.deletedIds ?? [trimmed]) {
      removeSpecialistApplicationLocal(id);
    }
    return {
      ok: true,
      authDeleted: Boolean(payload.authDeleted),
      deletedIds: payload.deletedIds ?? [trimmed],
    };
  } catch {
    return { ok: false, message: "Network error removing specialist account." };
  }
}

/** After approve: hard-delete other applications for same email/user. */
export async function deleteSiblingSpecialistApplicationsAsync(
  keeper: Pick<SpecialistApplication, "id" | "email" | "userId">
): Promise<{ ok: true; deletedIds: string[] } | { ok: false; message: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Unavailable on server" };
  }
  if (!isMarketplaceSupabaseActive()) {
    const email = keeper.email.trim().toLowerCase();
    const userId = keeper.userId?.trim() || "";
    const deletedIds: string[] = [];
    for (const app of listSpecialistApplications()) {
      if (app.id === keeper.id) continue;
      const sameEmail = email && app.email.trim().toLowerCase() === email;
      const sameUser = userId && app.userId?.trim() === userId;
      if (sameEmail || sameUser) {
        removeSpecialistApplicationLocal(app.id);
        deletedIds.push(app.id);
      }
    }
    return { ok: true, deletedIds };
  }

  try {
    const response = await fetch("/api/admin/specialist-applications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        deleteSiblingsOf: {
          id: keeper.id,
          email: keeper.email,
          userId: keeper.userId,
        },
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      deletedIds?: string[];
    } | null;
    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        message: payload?.message || "Could not clear duplicate applications.",
      };
    }
    for (const siblingId of payload.deletedIds ?? []) {
      removeSpecialistApplicationLocal(siblingId);
    }
    return { ok: true, deletedIds: payload.deletedIds ?? [] };
  } catch {
    return { ok: false, message: "Network error clearing duplicate applications." };
  }
}

export function refreshSpecialistApplicationsFromRemote(): void {
  hydrated = false;
  void hydrateFromSupabase();
}

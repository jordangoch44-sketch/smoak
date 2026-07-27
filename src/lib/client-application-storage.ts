import {
  fetchClientApplications,
  upsertClientApplication,
} from "@/lib/applications/client-applications-db";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { getAuthSessionSnapshot } from "@/lib/auth-session-store";
import { DEV_CLIENT_APPLICATIONS_KEY } from "@/lib/dev-storage-keys";
import type { ClientApplication } from "@/types/client-application";

const applicationListeners = new Set<() => void>();
const EMPTY_APPLICATIONS: readonly ClientApplication[] = [];

let cachedApplications: readonly ClientApplication[] = EMPTY_APPLICATIONS;
let hydrated = false;
let hydrating = false;
let loadGeneration = 0;

function applicationsSignature(apps: readonly ClientApplication[]): string {
  if (apps.length === 0) return "";
  return apps.map((a) => `${a.id}:${a.status}:${a.updatedAt}`).join("|");
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readLocalApplications(): ClientApplication[] {
  if (typeof window === "undefined") return [];
  return safeParse<ClientApplication[]>(
    window.localStorage.getItem(DEV_CLIENT_APPLICATIONS_KEY),
    []
  );
}

function writeLocalApplications(apps: readonly ClientApplication[]): void {
  if (typeof window === "undefined") return;
  if (isMarketplaceSupabaseActive()) return;
  try {
    if (apps.length === 0) {
      window.localStorage.removeItem(DEV_CLIENT_APPLICATIONS_KEY);
    } else {
      window.localStorage.setItem(
        DEV_CLIENT_APPLICATIONS_KEY,
        JSON.stringify(apps)
      );
    }
  } catch {
    /* ignore */
  }
}

function applyCache(apps: readonly ClientApplication[]): void {
  const next: readonly ClientApplication[] =
    apps.length > 0 ? [...apps] : EMPTY_APPLICATIONS;
  if (applicationsSignature(next) === applicationsSignature(cachedApplications)) {
    return;
  }
  cachedApplications = next;
  applicationListeners.forEach((listener) => listener());
}

function withSessionUserId(application: ClientApplication): ClientApplication {
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

  const supabase = getMarketplaceAuthClient();
  try {
    if (!supabase) {
      /* Live mode: empty until remote — never promote stale localStorage */
      applyCache([]);
      hydrated = true;
      return;
    }

    const result = await fetchClientApplications(supabase);

    if (generation !== loadGeneration) return;

    if (!result.ok) {
      console.warn("[SMOAC applications] client hydrate failed:", result.message);
      /* Keep memory cache — do not invent queue from stale localStorage */
      hydrated = true;
      return;
    }

    applyCache(result.applications);
    writeLocalApplications(result.applications);
    hydrated = true;
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

export function subscribeClientApplications(
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

export function getClientApplicationsSnapshot(): readonly ClientApplication[] {
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

export function getClientApplicationsServerSnapshot(): readonly ClientApplication[] {
  return EMPTY_APPLICATIONS;
}

export function listClientApplications(): readonly ClientApplication[] {
  return getClientApplicationsSnapshot();
}

/** Persist client application (cache + Supabase when configured). */
export function saveClientApplication(application: ClientApplication): void {
  if (typeof window === "undefined") return;
  const nextApp = withSessionUserId(application);
  const existing = listClientApplications();
  const next = [
    nextApp,
    ...existing.filter((item) => item.id !== nextApp.id),
  ];
  applyCache(next);
  writeLocalApplications(next);

  if (!isMarketplaceSupabaseActive()) return;
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return;
  void upsertClientApplication(supabase, nextApp).then((result) => {
    if (!result.ok) {
      console.warn("[SMOAC applications] client upsert failed:", result.message);
    }
  });
}

export async function saveClientApplicationAsync(
  application: ClientApplication
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Unavailable on server" };
  }
  const nextApp = withSessionUserId(application);
  const existing = listClientApplications();
  const next = [
    nextApp,
    ...existing.filter((item) => item.id !== nextApp.id),
  ];
  applyCache(next);
  writeLocalApplications(next);

  if (!isMarketplaceSupabaseActive()) return { ok: true };
  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication client unavailable" };
  }
  return upsertClientApplication(supabase, nextApp);
}

export function getClientApplicationById(
  id: string
): ClientApplication | null {
  return listClientApplications().find((item) => item.id === id) ?? null;
}

export function findClientApplicationByEmail(
  email: string
): ClientApplication | null {
  const normalized = email.trim().toLowerCase();
  return (
    listClientApplications().find(
      (item) => item.email.trim().toLowerCase() === normalized
    ) ?? null
  );
}

/** Force re-fetch from Supabase (e.g. after admin login). */
export function refreshClientApplicationsFromRemote(): void {
  hydrated = false;
  void hydrateFromSupabase();
}

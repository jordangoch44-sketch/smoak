import {
  fetchSpecialistApplications,
  importLocalSpecialistApplications,
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
import { enrichSpecialistApplicationFields } from "@/lib/specialist-application-fields";
import {
  INITIAL_SPECIALIST_ONBOARDING_STATE,
  type SpecialistApplication,
  type SpecialistOnboardingState,
} from "@/types/specialist-application";

function normalizeApplication(app: SpecialistApplication): SpecialistApplication {
  const enriched = enrichSpecialistApplicationFields(app) as SpecialistApplication;
  return {
    ...enriched,
    media: {
      ...INITIAL_SPECIALIST_ONBOARDING_STATE.media,
      ...enriched.media,
      profilePhotoOriginalUrl:
        enriched.media.profilePhotoOriginalUrl ||
        enriched.media.profilePhotoUrl ||
        "",
      profilePhotoCrop: enriched.media.profilePhotoCrop ?? null,
    },
  };
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

  const supabase = getMarketplaceAuthClient();
  try {
    if (!supabase) {
      applyCache(readLocalApplications());
      hydrated = true;
      return;
    }

    const local = readLocalApplications();
    const result =
      local.length > 0
        ? await importLocalSpecialistApplications(supabase, local)
        : await fetchSpecialistApplications(supabase);

    if (generation !== loadGeneration) return;

    if (!result.ok) {
      console.warn(
        "[SMOAC applications] specialist hydrate failed:",
        result.message
      );
      applyCache(local);
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
  if (!hydrated && cachedApplications === EMPTY_APPLICATIONS) {
    return readLocalApplications();
  }
  return cachedApplications;
}

export function getSpecialistApplicationsServerSnapshot(): readonly SpecialistApplication[] {
  return EMPTY_APPLICATIONS;
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

export function saveSpecialistApplication(
  application: SpecialistApplication
): void {
  if (typeof window === "undefined") return;
  const nextApp = withSessionUserId({ ...application, password: "" });
  const existing = listSpecialistApplications();
  const next = [
    nextApp,
    ...existing.filter((item) => item.id !== nextApp.id),
  ];
  applyCache(next);
  writeLocalApplications(next);

  if (!isMarketplaceSupabaseActive()) return;
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return;
  void upsertSpecialistApplication(supabase, nextApp).then((result) => {
    if (!result.ok) {
      console.warn(
        "[SMOAC applications] specialist upsert failed:",
        result.message
      );
    }
  });
}

export async function saveSpecialistApplicationAsync(
  application: SpecialistApplication
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Unavailable on server" };
  }
  const nextApp = withSessionUserId({ ...application, password: "" });
  const existing = listSpecialistApplications();
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
  return upsertSpecialistApplication(supabase, nextApp);
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
  return (
    listSpecialistApplications().find(
      (item) => item.email.trim().toLowerCase() === normalized
    ) ?? null
  );
}

export function refreshSpecialistApplicationsFromRemote(): void {
  hydrated = false;
  void hydrateFromSupabase();
}

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

/** Stable empty snapshot for useSyncExternalStore */
const EMPTY_APPLICATIONS: readonly SpecialistApplication[] = [];

let cachedApplications: readonly SpecialistApplication[] = EMPTY_APPLICATIONS;

function applicationsSignature(apps: readonly SpecialistApplication[]): string {
  if (apps.length === 0) return "";
  return apps
    .map((a) => `${a.id}:${a.profileStatus}:${a.updatedAt}`)
    .join("|");
}

function reloadApplicationsCache(): readonly SpecialistApplication[] {
  if (typeof window === "undefined") {
    return EMPTY_APPLICATIONS;
  }

  const loaded = safeParse<SpecialistApplication[]>(
    window.localStorage.getItem(DEV_SPECIALIST_APPLICATIONS_KEY),
    []
  ).map(normalizeApplication);
  const next: readonly SpecialistApplication[] =
    loaded.length > 0 ? [...loaded] : EMPTY_APPLICATIONS;

  if (applicationsSignature(next) === applicationsSignature(cachedApplications)) {
    return cachedApplications;
  }

  cachedApplications = next;
  return cachedApplications;
}

function notifyApplicationsChanged(): void {
  reloadApplicationsCache();
  applicationListeners.forEach((listener) => listener());
}

export function subscribeSpecialistApplications(
  onStoreChange: () => void
): () => void {
  if (typeof window !== "undefined") {
    reloadApplicationsCache();
  }
  applicationListeners.add(onStoreChange);
  return () => applicationListeners.delete(onStoreChange);
}

export function getSpecialistApplicationsSnapshot(): readonly SpecialistApplication[] {
  return reloadApplicationsCache();
}

export function getSpecialistApplicationsServerSnapshot(): readonly SpecialistApplication[] {
  return EMPTY_APPLICATIONS;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** DEV ONLY — autosave draft between onboarding steps */
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

export function saveSpecialistApplication(application: SpecialistApplication): void {
  if (typeof window === "undefined") return;
  const existing = listSpecialistApplications();
  const next = [
    application,
    ...existing.filter((item) => item.id !== application.id),
  ];
  try {
    window.localStorage.setItem(
      DEV_SPECIALIST_APPLICATIONS_KEY,
      JSON.stringify(next)
    );
    notifyApplicationsChanged();
  } catch {
    /* ignore */
  }
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

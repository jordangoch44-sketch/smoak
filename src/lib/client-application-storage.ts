import { DEV_CLIENT_APPLICATIONS_KEY } from "@/lib/dev-storage-keys";
import type { ClientApplication } from "@/types/client-application";

const applicationListeners = new Set<() => void>();
const EMPTY_APPLICATIONS: readonly ClientApplication[] = [];

let cachedApplications: readonly ClientApplication[] = EMPTY_APPLICATIONS;

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

function reloadApplicationsCache(): readonly ClientApplication[] {
  if (typeof window === "undefined") {
    return EMPTY_APPLICATIONS;
  }

  const loaded = safeParse<ClientApplication[]>(
    window.localStorage.getItem(DEV_CLIENT_APPLICATIONS_KEY),
    []
  );
  const next: readonly ClientApplication[] =
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

export function subscribeClientApplications(
  onStoreChange: () => void
): () => void {
  if (typeof window !== "undefined") {
    reloadApplicationsCache();
  }
  applicationListeners.add(onStoreChange);
  return () => applicationListeners.delete(onStoreChange);
}

export function getClientApplicationsSnapshot(): readonly ClientApplication[] {
  return reloadApplicationsCache();
}

export function getClientApplicationsServerSnapshot(): readonly ClientApplication[] {
  return EMPTY_APPLICATIONS;
}

export function listClientApplications(): readonly ClientApplication[] {
  return getClientApplicationsSnapshot();
}

export function saveClientApplication(application: ClientApplication): void {
  if (typeof window === "undefined") return;
  const existing = listClientApplications();
  const next = [
    application,
    ...existing.filter((item) => item.id !== application.id),
  ];
  try {
    window.localStorage.setItem(
      DEV_CLIENT_APPLICATIONS_KEY,
      JSON.stringify(next)
    );
    notifyApplicationsChanged();
  } catch {
    /* ignore */
  }
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

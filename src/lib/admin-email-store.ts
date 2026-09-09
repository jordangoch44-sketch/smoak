import { DEV_ADMIN_EMAIL_CATALOG_KEY } from "@/lib/dev-storage-keys";
import type {
  AdminEmailAudienceId,
  AdminEmailKind,
  AdminEmailStatus,
  AdminEmailTriggerKind,
  AdminManagedEmail,
} from "@/types/admin-email";

const listeners = new Set<() => void>();
const EMPTY: AdminManagedEmail[] = [];
let cached: AdminManagedEmail[] = EMPTY;
let hasHydrated = false;

const STATUSES = new Set<AdminEmailStatus>([
  "draft",
  "active",
  "paused",
  "scheduled",
  "sent",
]);
const KINDS = new Set<AdminEmailKind>(["automated", "one_time"]);
const AUDIENCES = new Set<AdminEmailAudienceId>([
  "specialists_all",
  "clients_all",
  "specialists_pro",
  "specialists_free",
  "inactive",
]);
const TRIGGERS = new Set<AdminEmailTriggerKind>([
  "after_signup",
  "after_approval",
  "profile_incomplete",
  "weekly",
  "inactive",
  "one_time",
  "custom",
]);

function notify(): void {
  listeners.forEach((listener) => listener());
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseEmail(value: unknown): AdminManagedEmail | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = asString(row.id).trim();
  const status = asString(row.status) as AdminEmailStatus;
  const kind = asString(row.kind) as AdminEmailKind;
  const triggerKind = asString(row.triggerKind) as AdminEmailTriggerKind;
  if (!id || !STATUSES.has(status) || !KINDS.has(kind) || !TRIGGERS.has(triggerKind)) {
    return null;
  }
  const audienceIds = Array.isArray(row.audienceIds)
    ? row.audienceIds.filter(
        (id): id is AdminEmailAudienceId =>
          typeof id === "string" && AUDIENCES.has(id as AdminEmailAudienceId)
      )
    : [];
  const createdAt = asString(row.createdAt) || new Date().toISOString();
  return {
    id,
    name: asString(row.name),
    subject: asString(row.subject),
    kind,
    triggerKind,
    triggerLabel: asString(row.triggerLabel) || triggerKind,
    audienceIds,
    status,
    preheader: asString(row.preheader),
    eyebrow: asString(row.eyebrow),
    title: asString(row.title),
    body: asString(row.body),
    imageUrl: asString(row.imageUrl),
    ctaLabel: asString(row.ctaLabel),
    ctaHref: asString(row.ctaHref),
    includeUnsubscribe: row.includeUnsubscribe !== false,
    scheduledAt: asNullableString(row.scheduledAt),
    lastSentAt: asNullableString(row.lastSentAt),
    queuedForSend: row.queuedForSend === true,
    sentCount: asNumber(row.sentCount),
    openRate: asNullableNumber(row.openRate),
    clickRate: asNullableNumber(row.clickRate),
    unsubscribeRate: asNullableNumber(row.unsubscribeRate),
    createdAt,
    updatedAt: asString(row.updatedAt) || createdAt,
  };
}

function readStorage(): AdminManagedEmail[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(DEV_ADMIN_EMAIL_CATALOG_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY;
    const emails = parsed
      .map(parseEmail)
      .filter((row): row is AdminManagedEmail => row != null);
    return emails.length > 0 ? emails : EMPTY;
  } catch {
    return EMPTY;
  }
}

function persist(emails: AdminManagedEmail[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DEV_ADMIN_EMAIL_CATALOG_KEY,
      JSON.stringify(emails)
    );
  } catch {
    /* ignore quota */
  }
}

function readCache(): AdminManagedEmail[] {
  if (typeof window === "undefined") return EMPTY;
  if (!hasHydrated) {
    hasHydrated = true;
    cached = readStorage();
  }
  return cached;
}

function writeCache(emails: AdminManagedEmail[]): void {
  cached = emails.length > 0 ? emails : EMPTY;
  persist(cached);
  notify();
}

export function subscribeAdminEmails(onStoreChange: () => void): () => void {
  if (typeof window !== "undefined") readCache();
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getAdminEmailsSnapshot(): AdminManagedEmail[] {
  return readCache();
}

export function getAdminEmailsServerSnapshot(): AdminManagedEmail[] {
  return EMPTY;
}

export function upsertAdminEmail(email: AdminManagedEmail): AdminManagedEmail {
  const nextEmail: AdminManagedEmail = {
    ...email,
    updatedAt: new Date().toISOString(),
  };
  const current = readCache();
  const index = current.findIndex((row) => row.id === nextEmail.id);
  const next =
    index >= 0
      ? current.map((row, i) => (i === index ? nextEmail : row))
      : [nextEmail, ...current];
  writeCache(next);
  return nextEmail;
}

export function removeAdminEmail(id: string): void {
  writeCache(readCache().filter((row) => row.id !== id));
}

export function setAdminEmailStatus(
  id: string,
  status: AdminEmailStatus
): AdminManagedEmail | null {
  const current = readCache().find((row) => row.id === id);
  if (!current) return null;
  return upsertAdminEmail({ ...current, status });
}

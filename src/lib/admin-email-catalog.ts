import {
  escapeEmailHtml,
  renderEmailParagraphs,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import type {
  AdminEmailAnalyticsRange,
  AdminEmailAnalyticsSnapshot,
  AdminEmailAudienceId,
  AdminEmailKind,
  AdminEmailStatus,
  AdminEmailTriggerKind,
  AdminManagedEmail,
} from "@/types/admin-email";

export const ADMIN_EMAIL_AUDIENCE_OPTIONS: ReadonlyArray<{
  id: AdminEmailAudienceId;
  label: string;
  hint: string;
}> = [
  {
    id: "specialists_all",
    label: "Specialists (all)",
    hint: "Every specialist account",
  },
  {
    id: "clients_all",
    label: "Clients (all)",
    hint: "Every client account",
  },
  {
    id: "specialists_pro",
    label: "Pro only",
    hint: "Specialists on a paid plan",
  },
  {
    id: "specialists_free",
    label: "Free only",
    hint: "Specialists on the free plan",
  },
  {
    id: "inactive",
    label: "Inactive",
    hint: "Accounts that have gone quiet",
  },
];

export const ADMIN_EMAIL_TRIGGER_OPTIONS: ReadonlyArray<{
  id: AdminEmailTriggerKind;
  label: string;
  defaultLabel: string;
}> = [
  { id: "after_signup", label: "After sign up", defaultLabel: "After Sign Up" },
  {
    id: "profile_incomplete",
    label: "Profile incomplete",
    defaultLabel: "Profile Incomplete",
  },
  { id: "weekly", label: "Weekly", defaultLabel: "Weekly (Mon)" },
  { id: "one_time", label: "One-time", defaultLabel: "One-Time" },
  { id: "custom", label: "Custom", defaultLabel: "Custom" },
];

export const ADMIN_EMAIL_STATUS_OPTIONS: ReadonlyArray<{
  id: AdminEmailStatus | "all";
  label: string;
}> = [
  { id: "all", label: "All statuses" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "draft", label: "Draft" },
  { id: "scheduled", label: "Scheduled" },
  { id: "sent", label: "Sent" },
];

export type AdminEmailSortKey =
  | "updated"
  | "name"
  | "status"
  | "audience"
  | "trigger";

function newEmailId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `email_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultTriggerLabel(kind: AdminEmailTriggerKind): string {
  return (
    ADMIN_EMAIL_TRIGGER_OPTIONS.find((option) => option.id === kind)?.defaultLabel ??
    "Custom"
  );
}

export function createAdminEmailDraft(kind: AdminEmailKind): AdminManagedEmail {
  const now = new Date().toISOString();
  const triggerKind: AdminEmailTriggerKind =
    kind === "one_time" ? "one_time" : "after_signup";
  return {
    id: newEmailId(),
    name: "",
    subject: "",
    kind,
    triggerKind,
    triggerLabel: defaultTriggerLabel(triggerKind),
    audienceIds: ["specialists_all"],
    status: "draft",
    preheader: "",
    eyebrow: kind === "one_time" ? "Announcement" : "SMOAC",
    title: "",
    body: "",
    imageUrl: "",
    ctaLabel: "",
    ctaHref: "",
    includeUnsubscribe: true,
    scheduledAt: null,
    lastSentAt: null,
    queuedForSend: false,
    sentCount: 0,
    openRate: null,
    clickRate: null,
    unsubscribeRate: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateAdminEmailRecord(
  email: AdminManagedEmail
): AdminManagedEmail {
  const now = new Date().toISOString();
  return {
    ...email,
    id: newEmailId(),
    name: email.name.trim() ? `${email.name.trim()} (Copy)` : "Untitled (Copy)",
    status: "draft",
    queuedForSend: false,
    scheduledAt: null,
    lastSentAt: null,
    sentCount: 0,
    openRate: null,
    clickRate: null,
    unsubscribeRate: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function audienceLabel(id: AdminEmailAudienceId): string {
  return (
    ADMIN_EMAIL_AUDIENCE_OPTIONS.find((option) => option.id === id)?.label ?? id
  );
}

export function formatAudienceList(
  ids: readonly AdminEmailAudienceId[]
): string {
  if (ids.length === 0) return "—";
  const unique = [...new Set(ids)];
  if (
    unique.length === 2 &&
    unique.includes("specialists_all") &&
    unique.includes("clients_all")
  ) {
    return "Specialists + Clients";
  }
  return unique.map(audienceLabel).join(", ");
}

export function formatEmailPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(value < 1 && value !== 0 ? 1 : 0)}%`;
}

export function formatEmailDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function emailMatchesQuery(
  email: AdminManagedEmail,
  query: string
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    email.name,
    email.subject,
    email.triggerLabel,
    email.status,
    email.kind,
    formatAudienceList(email.audienceIds),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function filterAdminEmails(
  emails: readonly AdminManagedEmail[],
  options: {
    query: string;
    status: AdminEmailStatus | "all";
    audience: AdminEmailAudienceId | "all";
    trigger: AdminEmailTriggerKind | "all";
  }
): AdminManagedEmail[] {
  return emails.filter((email) => {
    if (!emailMatchesQuery(email, options.query)) return false;
    if (options.status !== "all" && email.status !== options.status) return false;
    if (
      options.audience !== "all" &&
      !email.audienceIds.includes(options.audience)
    ) {
      return false;
    }
    if (options.trigger !== "all" && email.triggerKind !== options.trigger) {
      return false;
    }
    return true;
  });
}

export function sortAdminEmails(
  emails: readonly AdminManagedEmail[],
  sort: AdminEmailSortKey
): AdminManagedEmail[] {
  const next = [...emails];
  next.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "status") return a.status.localeCompare(b.status);
    if (sort === "audience") {
      return formatAudienceList(a.audienceIds).localeCompare(
        formatAudienceList(b.audienceIds)
      );
    }
    if (sort === "trigger") return a.triggerLabel.localeCompare(b.triggerLabel);
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  return next;
}

export function validateAdminEmail(
  email: AdminManagedEmail
): string | null {
  if (!email.name.trim()) return "Add a name for this email.";
  if (!email.subject.trim()) return "Add a subject line.";
  if (email.audienceIds.length === 0) return "Choose at least one audience.";
  if (!email.body.trim() && !email.title.trim()) {
    return "Add a title or message body.";
  }
  return null;
}

export function applyEmailMergeFields(
  value: string,
  fields: { firstName?: string }
): string {
  const firstName = fields.firstName?.trim() || "there";
  return value.replace(/\{\{\s*first_name\s*\}\}/gi, firstName);
}

export function buildAdminEmailPreviewHtml(
  email: AdminManagedEmail,
  options?: { firstName?: string; unsubscribeUrl?: string }
): string {
  const firstName = options?.firstName;
  const title = applyEmailMergeFields(
    email.title.trim() || email.name.trim() || "Untitled email",
    { firstName }
  );
  const paragraphs = applyEmailMergeFields(email.body, { firstName })
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const imageUrl = email.imageUrl.trim();
  const imageHtml =
    imageUrl && /^https?:\/\//i.test(imageUrl)
      ? `<p style="margin:0 0 16px;"><img src="${escapeEmailHtml(imageUrl)}" alt="" style="display:block;width:100%;max-width:100%;border:0;border-radius:12px;"/></p>`
      : "";
  const cta =
    email.ctaLabel.trim() && email.ctaHref.trim()
      ? { label: email.ctaLabel.trim(), href: email.ctaHref.trim() }
      : undefined;

  return wrapTransactionalEmailHtml({
    preheader: applyEmailMergeFields(
      email.preheader.trim() || email.subject.trim() || title,
      { firstName }
    ),
    eyebrow: email.eyebrow.trim() || "SMOAC",
    title,
    bodyHtml: `${imageHtml}${renderEmailParagraphs(
      paragraphs.length > 0 ? paragraphs : [" "]
    )}`,
    cta,
    footerNote: email.includeUnsubscribe
      ? "You're receiving this because you have a SMOAC account."
      : "Luxury wellness marketplace · Find specialists near you.",
    unsubscribeHref:
      email.includeUnsubscribe && options?.unsubscribeUrl
        ? options.unsubscribeUrl
        : undefined,
  });
}

export function buildAdminEmailText(
  email: AdminManagedEmail,
  options?: { firstName?: string; unsubscribeUrl?: string }
): string {
  const firstName = options?.firstName;
  const title = applyEmailMergeFields(
    email.title.trim() || email.name.trim(),
    { firstName }
  );
  const body = applyEmailMergeFields(email.body.trim(), { firstName });
  const cta =
    email.ctaLabel.trim() && email.ctaHref.trim()
      ? `\n${email.ctaLabel.trim()}: ${email.ctaHref.trim()}`
      : "";
  const unsub =
    email.includeUnsubscribe && options?.unsubscribeUrl
      ? `\nUnsubscribe: ${options.unsubscribeUrl}`
      : "";
  return [title, body, cta, unsub].filter(Boolean).join("\n\n");
}

export function emptyEmailAnalytics(
  range: AdminEmailAnalyticsRange
): AdminEmailAnalyticsSnapshot {
  const days = range === "7d" ? 7 : 30;
  const points = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return {
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sent: 0,
      opened: 0,
      clicked: 0,
    };
  });
  return {
    range,
    emailsSent: 0,
    openRate: null,
    clickRate: null,
    unsubscribeRate: null,
    bounceCount: 0,
    complaintCount: 0,
    points,
  };
}

export function adminEmailsToCsv(emails: readonly AdminManagedEmail[]): string {
  const header = [
    "Name",
    "Subject",
    "Kind",
    "Trigger",
    "Audience",
    "Status",
    "Last sent",
    "Open rate",
    "Click rate",
    "Unsubscribed",
  ];
  const rows = emails.map((email) =>
    [
      email.name,
      email.subject,
      email.kind,
      email.triggerLabel,
      formatAudienceList(email.audienceIds),
      email.status,
      formatEmailDate(email.lastSentAt),
      formatEmailPercent(email.openRate),
      formatEmailPercent(email.clickRate),
      formatEmailPercent(email.unsubscribeRate),
    ].map(csvCell)
  );
  return [header, ...rows].map((row) => row.join(",")).join("\n");
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function downloadAdminEmailsCsv(emails: readonly AdminManagedEmail[]): void {
  if (typeof window === "undefined") return;
  const csv = adminEmailsToCsv(emails);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "smoac-admin-emails.csv";
  link.click();
  URL.revokeObjectURL(url);
}

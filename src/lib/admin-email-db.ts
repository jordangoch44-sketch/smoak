import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type {
  AdminEmailAudienceId,
  AdminEmailKind,
  AdminEmailRecipient,
  AdminEmailRecipientStatus,
  AdminEmailStatus,
  AdminEmailTriggerKind,
  AdminManagedEmail,
} from "@/types/admin-email";

const AUDIENCES = new Set<AdminEmailAudienceId>([
  "specialists_all",
  "clients_all",
  "specialists_pro",
  "specialists_free",
  "inactive",
]);

function rate(part: number, total: number): number | null {
  if (total <= 0) return null;
  return (part / total) * 100;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export interface AdminEmailRow {
  id: string;
  name: string;
  subject: string;
  kind: string;
  trigger_kind: string;
  trigger_label: string;
  audience_ids: string[] | null;
  status: string;
  preheader: string;
  eyebrow: string;
  title: string;
  body: string;
  image_url: string;
  cta_label: string;
  cta_href: string;
  include_unsubscribe: boolean;
  scheduled_at: string | null;
  last_sent_at: string | null;
  queued_for_send: boolean;
  sent_count: number;
  open_count: number;
  click_count: number;
  unsubscribe_count: number;
  bounce_count: number;
  complaint_count: number;
  created_at: string;
  updated_at: string;
}

export function mapAdminEmailRow(row: AdminEmailRow): AdminManagedEmail {
  const sent = Number(row.sent_count) || 0;
  return {
    id: row.id,
    name: asString(row.name),
    subject: asString(row.subject),
    kind: row.kind === "one_time" ? "one_time" : "automated",
    triggerKind: row.trigger_kind as AdminEmailTriggerKind,
    triggerLabel: asString(row.trigger_label),
    audienceIds: (row.audience_ids ?? []).filter(
      (id): id is AdminEmailAudienceId => AUDIENCES.has(id as AdminEmailAudienceId)
    ),
    status: row.status as AdminEmailStatus,
    preheader: asString(row.preheader),
    eyebrow: asString(row.eyebrow),
    title: asString(row.title),
    body: asString(row.body),
    imageUrl: asString(row.image_url),
    ctaLabel: asString(row.cta_label),
    ctaHref: asString(row.cta_href),
    includeUnsubscribe: row.include_unsubscribe !== false,
    scheduledAt: row.scheduled_at,
    lastSentAt: row.last_sent_at,
    queuedForSend: Boolean(row.queued_for_send),
    sentCount: sent,
    openRate: rate(Number(row.open_count) || 0, sent),
    clickRate: rate(Number(row.click_count) || 0, sent),
    unsubscribeRate: rate(Number(row.unsubscribe_count) || 0, sent),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toAdminEmailWrite(
  email: AdminManagedEmail,
  createdBy?: string | null
): Record<string, unknown> {
  return {
    id: email.id,
    name: email.name,
    subject: email.subject,
    kind: email.kind as AdminEmailKind,
    trigger_kind: email.triggerKind,
    trigger_label: email.triggerLabel,
    audience_ids: email.audienceIds,
    status: email.status,
    preheader: email.preheader,
    eyebrow: email.eyebrow,
    title: email.title,
    body: email.body,
    image_url: email.imageUrl,
    cta_label: email.ctaLabel,
    cta_href: email.ctaHref,
    include_unsubscribe: email.includeUnsubscribe,
    scheduled_at: email.scheduledAt,
    last_sent_at: email.lastSentAt,
    queued_for_send: email.queuedForSend,
    created_by: createdBy ?? null,
  };
}

export async function listAdminEmailsFromDb(): Promise<AdminManagedEmail[] | null> {
  const service = createSupabaseServiceClient();
  if (!service) return null;
  const { data, error } = await service
    .from("admin_emails")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error || !data) {
    if (error) console.warn("[admin email] list failed", error.message);
    return null;
  }
  return (data as AdminEmailRow[]).map(mapAdminEmailRow);
}

export async function getAdminEmailFromDb(
  id: string
): Promise<AdminManagedEmail | null> {
  const service = createSupabaseServiceClient();
  if (!service) return null;
  const { data, error } = await service
    .from("admin_emails")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapAdminEmailRow(data as AdminEmailRow);
}

export async function upsertAdminEmailInDb(
  email: AdminManagedEmail,
  createdBy?: string | null
): Promise<AdminManagedEmail | null> {
  const service = createSupabaseServiceClient();
  if (!service) return null;
  const { data, error } = await service
    .from("admin_emails")
    .upsert(toAdminEmailWrite(email, createdBy), { onConflict: "id" })
    .select("*")
    .single();
  if (error || !data) {
    if (error) console.warn("[admin email] upsert failed", error.message);
    return null;
  }
  return mapAdminEmailRow(data as AdminEmailRow);
}

export async function deleteAdminEmailFromDb(id: string): Promise<boolean> {
  const service = createSupabaseServiceClient();
  if (!service) return false;
  const { error } = await service.from("admin_emails").delete().eq("id", id);
  return !error;
}

export async function listAdminEmailRecipientsFromDb(
  emailId: string,
  limit = 200
): Promise<AdminEmailRecipient[]> {
  const service = createSupabaseServiceClient();
  if (!service) return [];
  const { data, error } = await service
    .from("admin_email_recipients")
    .select(
      "id, email_id, send_id, to_email, to_name, status, error, sent_at, opened_at, clicked_at, bounced_at, unsubscribed_at"
    )
    .eq("email_id", emailId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id),
    emailId: String(row.email_id),
    sendId: row.send_id ? String(row.send_id) : null,
    toEmail: String(row.to_email ?? ""),
    toName: String(row.to_name ?? ""),
    status: String(row.status) as AdminEmailRecipientStatus,
    error: row.error ? String(row.error) : null,
    sentAt: row.sent_at ? String(row.sent_at) : null,
    openedAt: row.opened_at ? String(row.opened_at) : null,
    clickedAt: row.clicked_at ? String(row.clicked_at) : null,
    bouncedAt: row.bounced_at ? String(row.bounced_at) : null,
    unsubscribedAt: row.unsubscribed_at ? String(row.unsubscribed_at) : null,
  }));
}

export async function refreshAdminEmailCounts(emailId: string): Promise<void> {
  const service = createSupabaseServiceClient();
  if (!service) return;
  const { data } = await service
    .from("admin_email_recipients")
    .select("status")
    .eq("email_id", emailId);
  const rows = data ?? [];
  const sent = rows.filter((row) =>
    ["sent", "opened", "clicked", "unsubscribed"].includes(String(row.status))
  ).length;
  const opened = rows.filter((row) =>
    ["opened", "clicked"].includes(String(row.status))
  ).length;
  const clicked = rows.filter((row) => String(row.status) === "clicked").length;
  const unsubscribed = rows.filter(
    (row) => String(row.status) === "unsubscribed"
  ).length;
  const bounced = rows.filter((row) => String(row.status) === "bounced").length;
  const complained = rows.filter(
    (row) => String(row.status) === "complained"
  ).length;
  await service
    .from("admin_emails")
    .update({
      sent_count: sent,
      open_count: opened,
      click_count: clicked,
      unsubscribe_count: unsubscribed,
      bounce_count: bounced,
      complaint_count: complained,
    })
    .eq("id", emailId);
}

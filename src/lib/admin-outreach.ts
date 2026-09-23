import {
  renderEmailParagraphs,
  wrapTransactionalEmailHtml,
} from "@/lib/email/email-html-shell";
import { sendOutboundEmail } from "@/lib/email/email-transport";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const NAME_MAX = 80;
const SUBJECT_MAX = 200;
const BODY_MAX = 8000;
const RECENT_LIMIT = 20;

const OUTREACH_FROM = "SMOAC <team@smoac.com>";
const OUTREACH_REPLY_TO = "team@smoac.com";

const OPT_OUT =
  "SMOAC reached out because your work is public. Reply to this email if you would rather not hear from us.";

export interface AdminOutreachTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  updatedAt: string | null;
}

export interface AdminOutreachSend {
  id: string;
  templateId: string | null;
  templateName: string;
  toEmail: string;
  subject: string;
  status: "sent" | "failed";
  error: string | null;
  createdAt: string;
}

export interface AdminOutreachSnapshot {
  templates: AdminOutreachTemplate[];
  sends: AdminOutreachSend[];
}

export interface AdminOutreachDraft {
  name: string;
  subject: string;
  body: string;
}

function missingTable(message: string): boolean {
  return /relation .* does not exist|Could not find the table|schema cache/i.test(
    message
  );
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeOutreachEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isOutreachEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

export function normalizeOutreachDraft(input: {
  name?: unknown;
  subject?: unknown;
  body?: unknown;
}): AdminOutreachDraft | { error: string } {
  const name = asString(input.name).trim().slice(0, NAME_MAX);
  const subject = asString(input.subject).trim().slice(0, SUBJECT_MAX);
  const body = asString(input.body).trim().slice(0, BODY_MAX);
  if (!name) return { error: "Name this email, like Independent trainers or Gyms." };
  if (!subject) return { error: "Add a subject line." };
  if (!body) return { error: "Paste the message you want to send." };
  return { name, subject, body };
}

function mapTemplate(row: Record<string, unknown>): AdminOutreachTemplate {
  return {
    id: asString(row.id),
    name: asString(row.name),
    subject: asString(row.subject),
    body: asString(row.body),
    updatedAt: asString(row.updated_at) || null,
  };
}

function outreachHtml(subject: string, body: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  return wrapTransactionalEmailHtml({
    preheader: subject,
    eyebrow: "SMOAC",
    title: subject,
    bodyHtml: renderEmailParagraphs(
      paragraphs.length > 0 ? paragraphs : [body]
    ),
    footerNote: OPT_OUT,
  });
}

function outreachText(body: string): string {
  return [body.trim(), OPT_OUT, `Questions? Email ${OUTREACH_REPLY_TO}`]
    .filter(Boolean)
    .join("\n\n");
}

export async function readAdminOutreach(): Promise<
  { ok: true; snapshot: AdminOutreachSnapshot } | { ok: false; message: string }
> {
  const service = createSupabaseServiceClient();
  if (!service) {
    return { ok: false, message: "Email storage is not connected." };
  }

  const { data, error } = await service
    .from("admin_outreach_templates")
    .select("id, name, subject, body, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    return {
      ok: false,
      message: missingTable(error.message)
        ? "Apply the admin outreach tables, then reload this page."
        : "Could not load fixed emails.",
    };
  }

  const { data: sendRows, error: sendError } = await service
    .from("admin_outreach_sends")
    .select(
      "id, template_id, template_name, to_email, subject, status, error, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);

  if (sendError) {
    return {
      ok: false,
      message: missingTable(sendError.message)
        ? "Apply the admin outreach tables, then reload this page."
        : "Could not load recent sends.",
    };
  }

  const sends: AdminOutreachSend[] = (sendRows ?? []).map((row) => ({
    id: asString(row.id),
    templateId: asString(row.template_id) || null,
    templateName: asString(row.template_name),
    toEmail: asString(row.to_email),
    subject: asString(row.subject),
    status: row.status === "failed" ? "failed" : "sent",
    error: asString(row.error) || null,
    createdAt: asString(row.created_at),
  }));

  return {
    ok: true,
    snapshot: {
      templates: (data ?? []).map((row) => mapTemplate(row)),
      sends,
    },
  };
}

export async function createAdminOutreachTemplate(
  draft: AdminOutreachDraft,
  userId: string
): Promise<
  { ok: true; template: AdminOutreachTemplate } | { ok: false; message: string }
> {
  const service = createSupabaseServiceClient();
  if (!service) return { ok: false, message: "Email storage is not connected." };

  const now = new Date().toISOString();
  const { data, error } = await service
    .from("admin_outreach_templates")
    .insert({
      name: draft.name,
      subject: draft.subject,
      body: draft.body,
      updated_by: userId,
      updated_at: now,
    })
    .select("id, name, subject, body, updated_at")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: error && missingTable(error.message)
        ? "Apply the admin outreach tables, then try again."
        : "Could not save that fixed email.",
    };
  }
  return { ok: true, template: mapTemplate(data) };
}

export async function updateAdminOutreachTemplate(
  id: string,
  draft: AdminOutreachDraft,
  userId: string
): Promise<
  { ok: true; template: AdminOutreachTemplate } | { ok: false; message: string }
> {
  const service = createSupabaseServiceClient();
  if (!service) return { ok: false, message: "Email storage is not connected." };
  if (!id) return { ok: false, message: "Missing fixed email." };

  const now = new Date().toISOString();
  const { data, error } = await service
    .from("admin_outreach_templates")
    .update({
      name: draft.name,
      subject: draft.subject,
      body: draft.body,
      updated_by: userId,
      updated_at: now,
    })
    .eq("id", id)
    .select("id, name, subject, body, updated_at")
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: missingTable(error.message)
        ? "Apply the admin outreach tables, then try again."
        : "Could not save that fixed email.",
    };
  }
  if (!data) return { ok: false, message: "That fixed email is gone." };
  return { ok: true, template: mapTemplate(data) };
}

export async function deleteAdminOutreachTemplate(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const service = createSupabaseServiceClient();
  if (!service) return { ok: false, message: "Email storage is not connected." };
  if (!id) return { ok: false, message: "Missing fixed email." };

  const { error } = await service
    .from("admin_outreach_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      message: missingTable(error.message)
        ? "Apply the admin outreach tables, then try again."
        : "Could not delete that fixed email.",
    };
  }
  return { ok: true };
}

async function alreadySent(
  templateId: string,
  toEmail: string
): Promise<boolean> {
  const service = createSupabaseServiceClient();
  if (!service) return false;
  const { data } = await service
    .from("admin_outreach_sends")
    .select("id")
    .eq("template_id", templateId)
    .eq("to_email", toEmail)
    .eq("status", "sent")
    .limit(1);
  return Boolean(data && data.length > 0);
}

async function logSend(row: {
  templateId: string;
  templateName: string;
  toEmail: string;
  subject: string;
  status: "sent" | "failed";
  error: string | null;
  providerId: string | null;
  sentBy: string;
}): Promise<void> {
  const service = createSupabaseServiceClient();
  if (!service) return;
  const { error } = await service.from("admin_outreach_sends").insert({
    template_id: row.templateId,
    template_name: row.templateName,
    to_email: row.toEmail,
    subject: row.subject,
    status: row.status,
    error: row.error,
    provider_id: row.providerId,
    sent_by: row.sentBy,
  });
  if (error) {
    console.warn("[admin outreach] send log failed", error.message);
  }
}

export async function sendAdminOutreach(input: {
  templateId: string;
  toEmail: string;
  confirmResend: boolean;
  userId: string;
}): Promise<
  | { ok: true; message: string; mode: "resend" | "console" }
  | { ok: false; message: string; alreadySent?: boolean }
> {
  const toEmail = normalizeOutreachEmail(input.toEmail);
  if (!isOutreachEmail(toEmail)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!input.templateId) {
    return { ok: false, message: "Choose a fixed email first." };
  }

  const service = createSupabaseServiceClient();
  if (!service) return { ok: false, message: "Email storage is not connected." };

  const { data, error } = await service
    .from("admin_outreach_templates")
    .select("id, name, subject, body, updated_at")
    .eq("id", input.templateId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: missingTable(error.message)
        ? "Apply the admin outreach tables, then try again."
        : "Could not load that fixed email.",
    };
  }
  if (!data) return { ok: false, message: "That fixed email is gone." };

  const template = mapTemplate(data);
  const draft = normalizeOutreachDraft(template);
  if ("error" in draft) return { ok: false, message: draft.error };

  if (
    !input.confirmResend &&
    (await alreadySent(template.id, toEmail))
  ) {
    return {
      ok: false,
      alreadySent: true,
      message: `${template.name} was already sent to ${toEmail}. Send it again?`,
    };
  }

  const result = await sendOutboundEmail({
    to: toEmail,
    subject: draft.subject,
    text: outreachText(draft.body),
    html: outreachHtml(draft.subject, draft.body),
    from: OUTREACH_FROM,
    replyTo: OUTREACH_REPLY_TO,
    kind: "outreach",
    tags: [{ name: "kind", value: "outreach" }],
  });

  await logSend({
    templateId: template.id,
    templateName: template.name,
    toEmail,
    subject: draft.subject,
    status: result.success ? "sent" : "failed",
    error: result.success ? null : "The mail provider did not accept this send.",
    providerId: result.providerId ?? null,
    sentBy: input.userId,
  });

  if (!result.success) {
    return { ok: false, message: "Could not send that email. Try again." };
  }

  const where =
    result.mode === "resend"
      ? `Sent “${template.name}” to ${toEmail}.`
      : `Logged “${template.name}” for ${toEmail}. Live sending is off until RESEND_API_KEY is set.`;
  return { ok: true, message: where, mode: result.mode };
}

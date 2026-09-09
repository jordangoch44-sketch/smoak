import {
  applyEmailMergeFields,
  buildAdminEmailPreviewHtml,
  buildAdminEmailText,
} from "@/lib/admin-email-catalog";
import {
  resolveAdminEmailAudience,
  resolveIncompleteSpecialists,
  type AdminEmailAudienceMember,
} from "@/lib/admin-email-audience";
import {
  getAdminEmailFromDb,
  listAdminEmailsFromDb,
  refreshAdminEmailCounts,
} from "@/lib/admin-email-db";
import { unsubscribeUrlFor } from "@/lib/admin-email-unsubscribe";
import { sendOutboundEmail } from "@/lib/email/email-transport";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type {
  AdminEmailAudienceId,
  AdminEmailDispatchResult,
  AdminManagedEmail,
} from "@/types/admin-email";

const QUEUE_BATCH = 80;
const WEEK_MS = 6 * 24 * 60 * 60 * 1000;

export type AdminEmailSendKind =
  | "send_now"
  | "scheduled"
  | "weekly"
  | "after_signup"
  | "profile_incomplete"
  | "resend_non_openers";

function emptyResult(message: string): AdminEmailDispatchResult {
  return {
    ok: false,
    message,
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    queued: 0,
  };
}

function weeklyShouldRun(label: string, now = new Date()): boolean {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const match = label.toLowerCase().match(/\b(sun|mon|tue|wed|thu|fri|sat)/);
  const want = match?.[1] ?? "mon";
  return days[now.getUTCDay()] === want;
}

async function alreadyReceived(
  emailId: string,
  toEmail: string
): Promise<boolean> {
  const service = createSupabaseServiceClient();
  if (!service) return false;
  const { data } = await service
    .from("admin_email_recipients")
    .select("id")
    .eq("email_id", emailId)
    .eq("to_email", toEmail)
    .in("status", ["queued", "sent", "opened", "clicked"])
    .limit(1);
  return Boolean(data && data.length > 0);
}

async function enqueueRecipients(
  email: AdminManagedEmail,
  sendKind: AdminEmailSendKind,
  members: AdminEmailAudienceMember[],
  options?: { skipIfAlreadySent?: boolean }
): Promise<{ sendId: string; queued: number; skipped: number }> {
  const service = createSupabaseServiceClient();
  if (!service) {
    return { sendId: "", queued: 0, skipped: members.length };
  }

  const { data: sendRow, error: sendError } = await service
    .from("admin_email_sends")
    .insert({
      email_id: email.id,
      kind: sendKind,
      attempted: members.length,
    })
    .select("id")
    .single();
  if (sendError || !sendRow) {
    console.warn("[admin email] send row failed", sendError?.message);
    return { sendId: "", queued: 0, skipped: members.length };
  }

  let skipped = 0;
  const rows: Array<Record<string, unknown>> = [];
  for (const member of members) {
    if (options?.skipIfAlreadySent && (await alreadyReceived(email.id, member.email))) {
      skipped += 1;
      continue;
    }
    rows.push({
      email_id: email.id,
      send_id: sendRow.id,
      to_email: member.email,
      to_name: member.firstName,
      user_id: member.userId,
      status: "queued",
    });
  }

  if (rows.length > 0) {
    const { error } = await service.from("admin_email_recipients").insert(rows);
    if (error) {
      console.warn("[admin email] recipient insert failed", error.message);
      return { sendId: String(sendRow.id), queued: 0, skipped: skipped + rows.length };
    }
  }

  return { sendId: String(sendRow.id), queued: rows.length, skipped };
}

export async function processQueuedAdminEmails(
  limit = QUEUE_BATCH
): Promise<{ sent: number; failed: number }> {
  const service = createSupabaseServiceClient();
  if (!service) return { sent: 0, failed: 0 };

  const { data: queued } = await service
    .from("admin_email_recipients")
    .select("id, email_id, to_email, to_name")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  const rows = queued ?? [];
  let sent = 0;
  let failed = 0;
  const templateCache = new Map<string, AdminManagedEmail | null>();

  for (const row of rows) {
    const emailId = String(row.email_id);
    if (!templateCache.has(emailId)) {
      templateCache.set(emailId, await getAdminEmailFromDb(emailId));
    }
    const template = templateCache.get(emailId);
    const to = String(row.to_email ?? "").trim().toLowerCase();
    if (!template || !to.includes("@")) {
      await service
        .from("admin_email_recipients")
        .update({ status: "failed", error: "Missing template or recipient" })
        .eq("id", row.id);
      failed += 1;
      continue;
    }

    const firstName = String(row.to_name ?? "");
    const unsubscribeUrl = template.includeUnsubscribe
      ? unsubscribeUrlFor(to, template.id)
      : undefined;
    const html = buildAdminEmailPreviewHtml(template, {
      firstName,
      unsubscribeUrl,
    });
    const text = buildAdminEmailText(template, { firstName, unsubscribeUrl });
    const subject = applyEmailMergeFields(template.subject, { firstName });

    const result = await sendOutboundEmail({
      to,
      subject,
      text,
      html,
      kind: "admin_broadcast",
      tags: [
        { name: "email_id", value: template.id },
        { name: "recipient_id", value: String(row.id) },
      ],
    });

    if (result.success) {
      await service
        .from("admin_email_recipients")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_id: result.providerId ?? null,
          error: null,
        })
        .eq("id", row.id);
      sent += 1;
    } else {
      await service
        .from("admin_email_recipients")
        .update({
          status: "failed",
          error: result.mode === "console" ? "Transport did not send" : "Send failed",
        })
        .eq("id", row.id);
      failed += 1;
    }
  }

  const touched = new Set(rows.map((row) => String(row.email_id)));
  for (const emailId of touched) {
    const now = new Date().toISOString();
    await service
      .from("admin_emails")
      .update({ last_sent_at: now, queued_for_send: false })
      .eq("id", emailId);
    await refreshAdminEmailCounts(emailId);
  }

  return { sent, failed };
}

async function dispatchToMembers(
  email: AdminManagedEmail,
  sendKind: AdminEmailSendKind,
  members: AdminEmailAudienceMember[],
  options?: { skipIfAlreadySent?: boolean }
): Promise<AdminEmailDispatchResult> {
  if (members.length === 0) {
    return {
      ok: true,
      message: "No matching recipients.",
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      queued: 0,
    };
  }

  const queued = await enqueueRecipients(email, sendKind, members, options);
  const processed = await processQueuedAdminEmails();
  const leftover = Math.max(0, queued.queued - processed.sent - processed.failed);
  let message = "No new recipients to send.";
  if (processed.sent > 0) {
    message = `Sent ${processed.sent} email${processed.sent === 1 ? "" : "s"}.`;
    if (processed.failed > 0) {
      message += ` ${processed.failed} failed.`;
    }
  } else if (processed.failed > 0) {
    message = "Send failed. Check that Resend is configured.";
  } else if (leftover > 0) {
    message = "Queued. Delivery will continue shortly.";
  }
  return {
    ok: processed.sent > 0 || (queued.queued === 0 && processed.failed === 0),
    message,
    attempted: members.length,
    sent: processed.sent,
    failed: processed.failed,
    skipped: queued.skipped,
    queued: leftover,
  };
}

export async function sendAdminEmailNow(
  emailId: string
): Promise<AdminEmailDispatchResult> {
  const email = await getAdminEmailFromDb(emailId);
  if (!email) return emptyResult("Email not found.");
  const members = await resolveAdminEmailAudience(email.audienceIds);
  const result = await dispatchToMembers(email, "send_now", members);
  if (email.kind === "one_time") {
    const service = createSupabaseServiceClient();
    await service
      ?.from("admin_emails")
      .update({ status: result.sent > 0 ? "sent" : email.status })
      .eq("id", email.id);
  }
  return result;
}

export async function resendAdminEmailToNonOpeners(
  emailId: string
): Promise<AdminEmailDispatchResult> {
  const service = createSupabaseServiceClient();
  const email = await getAdminEmailFromDb(emailId);
  if (!service || !email) return emptyResult("Email not found.");
  const { data } = await service
    .from("admin_email_recipients")
    .select("to_email, to_name, user_id, status, opened_at")
    .eq("email_id", emailId)
    .not("sent_at", "is", null);
  const members = ((data ?? []) as Array<{
    to_email: string;
    to_name: string | null;
    user_id: string | null;
    status: string;
    opened_at: string | null;
  }>)
    .filter(
      (row) =>
        !row.opened_at &&
        row.status !== "clicked" &&
        row.status !== "opened" &&
        row.status !== "unsubscribed" &&
        row.status !== "bounced"
    )
    .map((row) => ({
      email: String(row.to_email),
      firstName: String(row.to_name ?? ""),
      userId: row.user_id,
    }));
  return dispatchToMembers(email, "resend_non_openers", members);
}

export async function dispatchAfterSignupCatalogEmail(input: {
  to: string;
  firstName?: string | null;
  audience: "client" | "specialist";
}): Promise<void> {
  const emails = (await listAdminEmailsFromDb()) ?? [];
  const active = emails.filter(
    (email) =>
      email.status === "active" &&
      email.kind === "automated" &&
      email.triggerKind === "after_signup" &&
      email.audienceIds.some((id) =>
        input.audience === "client"
          ? id === "clients_all"
          : id === "specialists_all" ||
            id === "specialists_free" ||
            id === "specialists_pro"
      )
  );
  const member: AdminEmailAudienceMember = {
    email: input.to.trim().toLowerCase(),
    firstName: input.firstName?.trim() ?? "",
    userId: null,
  };
  for (const email of active) {
    await dispatchToMembers(email, "after_signup", [member], {
      skipIfAlreadySent: true,
    });
  }
}

export async function runAdminEmailMaintenance(): Promise<{
  processed: { sent: number; failed: number };
  weekly: number;
  scheduled: number;
  incomplete: number;
}> {
  const processed = await processQueuedAdminEmails();
  const emails = (await listAdminEmailsFromDb()) ?? [];
  let weekly = 0;
  let scheduled = 0;
  let incomplete = 0;
  const now = Date.now();

  for (const email of emails) {
    if (email.status === "scheduled" && email.scheduledAt) {
      const when = new Date(email.scheduledAt).getTime();
      if (Number.isFinite(when) && when <= now) {
        const result = await sendAdminEmailNow(email.id);
        if (result.attempted > 0) scheduled += 1;
      }
    }

    if (
      email.status === "active" &&
      email.kind === "automated" &&
      email.triggerKind === "weekly" &&
      weeklyShouldRun(email.triggerLabel)
    ) {
      const last = email.lastSentAt ? new Date(email.lastSentAt).getTime() : 0;
      if (!last || now - last > WEEK_MS) {
        const members = await resolveAdminEmailAudience(email.audienceIds);
        const result = await dispatchToMembers(email, "weekly", members);
        if (result.attempted > 0) weekly += 1;
      }
    }

    if (
      email.status === "active" &&
      email.kind === "automated" &&
      email.triggerKind === "profile_incomplete"
    ) {
      const members = await resolveIncompleteSpecialists();
      const result = await dispatchToMembers(email, "profile_incomplete", members, {
        skipIfAlreadySent: true,
      });
      if (result.attempted > 0) incomplete += 1;
    }
  }

  return { processed, weekly, scheduled, incomplete };
}

export async function previewAudienceCount(
  audienceIds: readonly AdminEmailAudienceId[]
): Promise<number> {
  const members = await resolveAdminEmailAudience(audienceIds);
  return members.length;
}

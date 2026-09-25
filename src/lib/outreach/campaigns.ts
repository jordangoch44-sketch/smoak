import { sendOutboundEmail } from "@/lib/email/email-transport";
import {
  isOutreachEmail,
  normalizeOutreachEmail,
} from "@/lib/admin-outreach";
import { prospectCanReceiveEmail, outreachSkipReason } from "@/lib/outreach/catalog";
import {
  OUTREACH_BATCH_DELAY_MS,
  OUTREACH_BATCH_SIZE,
  outreachLiveSendsEnabled,
} from "@/lib/outreach/live";
import {
  loadProspectsByIds,
  markOutreachUnsubscribed,
  type OutreachProspect,
} from "@/lib/outreach/prospects";
import { renderProspectOutreachEmail } from "@/lib/outreach/render-message";
import {
  asText,
  outreachService,
  outreachStorageError,
  selectInChunks,
} from "@/lib/outreach/storage";

export interface OutreachCampaignStats {
  recipients: number;
  sent: number;
  delivered: number;
  bounced: number;
  unsubscribed: number;
  replies: number;
  signups: number;
  failed: number;
  queued: number;
  dryRun: number;
}

export interface OutreachCampaignSummary {
  id: string;
  name: string;
  templateId: string | null;
  templateName: string;
  status: string;
  deliveryMode: "live" | "dry_run";
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  stats: OutreachCampaignStats;
}

export interface OutreachRecipientPreview {
  recipients: number;
  skipped: {
    noEmail: number;
    instagramOnly: number;
    unsubscribed: number;
    bounced: number;
    notInterested: number;
    signedUp: number;
    duplicate: number;
  };
}

const EMPTY_STATS = (): OutreachCampaignStats => ({
  recipients: 0,
  sent: 0,
  delivered: 0,
  bounced: 0,
  unsubscribed: 0,
  replies: 0,
  signups: 0,
  failed: 0,
  queued: 0,
  dryRun: 0,
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadTemplate(id: string): Promise<
  | { ok: true; id: string; name: string; subject: string; body: string }
  | { ok: false; message: string }
> {
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };
  const withArchive = await service
    .from("admin_outreach_templates")
    .select("id, name, subject, body, archived_at")
    .eq("id", id)
    .maybeSingle();

  if (withArchive.error && /archived_at/i.test(withArchive.error.message)) {
    const plain = await service
      .from("admin_outreach_templates")
      .select("id, name, subject, body")
      .eq("id", id)
      .maybeSingle();
    if (plain.error || !plain.data) {
      return { ok: false, message: "Could not load that template." };
    }
    return {
      ok: true,
      id: asText(plain.data.id),
      name: asText(plain.data.name),
      subject: asText(plain.data.subject),
      body: asText(plain.data.body),
    };
  }

  if (withArchive.error || !withArchive.data) {
    return {
      ok: false,
      message: withArchive.error
        ? outreachStorageError(withArchive.error.message, "Could not load that template.")
        : "Choose a template.",
    };
  }
  if (asText(withArchive.data.archived_at)) {
    return { ok: false, message: "That template is archived." };
  }
  return {
    ok: true,
    id: asText(withArchive.data.id),
    name: asText(withArchive.data.name),
    subject: asText(withArchive.data.subject),
    body: asText(withArchive.data.body),
  };
}

export function partitionRecipients(prospects: OutreachProspect[]): {
  sendable: OutreachProspect[];
  preview: OutreachRecipientPreview;
} {
  const preview: OutreachRecipientPreview = {
    recipients: 0,
    skipped: {
      noEmail: 0,
      instagramOnly: 0,
      unsubscribed: 0,
      bounced: 0,
      notInterested: 0,
      signedUp: 0,
      duplicate: 0,
    },
  };
  const seen = new Set<string>();
  const sendable: OutreachProspect[] = [];
  for (const prospect of prospects) {
    const reason = outreachSkipReason(prospect);
    if (reason === "no_email") preview.skipped.noEmail += 1;
    else if (reason === "instagram_only") preview.skipped.instagramOnly += 1;
    else if (reason === "unsubscribed") preview.skipped.unsubscribed += 1;
    else if (reason === "bounced") preview.skipped.bounced += 1;
    else if (reason === "not_interested") preview.skipped.notInterested += 1;
    else if (reason === "signed_up") preview.skipped.signedUp += 1;
    else if (prospect.email && seen.has(prospect.email)) {
      preview.skipped.duplicate += 1;
    } else if (prospectCanReceiveEmail(prospect) && prospect.email) {
      seen.add(prospect.email);
      sendable.push(prospect);
    }
  }
  preview.recipients = sendable.length;
  return { sendable, preview };
}

export async function previewOutreachCampaign(input: {
  templateId: string;
  prospectIds: string[];
  sample?: { name: string; business: string; email: string };
}): Promise<
  | {
      ok: true;
      preview: OutreachRecipientPreview;
      subject: string;
      html: string;
      text: string;
      liveSends: boolean;
    }
  | { ok: false; message: string }
> {
  const template = await loadTemplate(input.templateId);
  if (!template.ok) return template;
  const loaded = await loadProspectsByIds(input.prospectIds);
  if ("error" in loaded) return { ok: false, message: loaded.error };
  const { preview, sendable } = partitionRecipients(loaded);
  const sampleProspect = sendable[0];
  const sample = input.sample ?? {
    name: sampleProspect?.name || "Alex",
    business: sampleProspect?.business || "North Park Strength",
    email: sampleProspect?.email || "preview@smoac.com",
  };
  const rendered = renderProspectOutreachEmail({
    subject: template.subject,
    body: template.body,
    name: sample.name,
    business: sample.business,
    toEmail: sample.email.includes("@") ? sample.email : "preview@smoac.com",
  });
  return {
    ok: true,
    preview,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    liveSends: outreachLiveSendsEnabled(),
  };
}

export async function sendOutreachTest(input: {
  templateId: string;
  toEmail: string;
  name: string;
  business: string;
  userId: string;
}): Promise<{ ok: true; message: string; delivered: boolean } | { ok: false; message: string }> {
  const toEmail = normalizeOutreachEmail(input.toEmail);
  if (!isOutreachEmail(toEmail)) {
    return { ok: false, message: "Enter a valid test email address." };
  }
  const template = await loadTemplate(input.templateId);
  if (!template.ok) return template;
  const rendered = renderProspectOutreachEmail({
    subject: template.subject,
    body: template.body,
    name: input.name,
    business: input.business,
    toEmail,
  });

  const service = outreachService();
  if (service) {
    await service.from("outreach_events").insert({
      event_type: "test_sent",
      detail: {
        to: toEmail,
        template_id: template.id,
        delivered: outreachLiveSendsEnabled(),
      },
    });
  }

  if (!outreachLiveSendsEnabled()) {
    console.info("[outreach] test send blocked — OUTREACH_LIVE_SENDS is off", {
      to: toEmail,
      subject: rendered.subject,
    });
    return {
      ok: true,
      delivered: false,
      message: `Test recorded for ${toEmail}. Nothing was delivered. Set OUTREACH_LIVE_SENDS=true on the server to send for real.`,
    };
  }

  const result = await sendOutboundEmail({
    to: toEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    from: "SMOAC <team@smoac.com>",
    replyTo: "team@smoac.com",
    kind: "outreach",
    tags: [{ name: "kind", value: "outreach_test" }],
  });
  if (!result.success) {
    return { ok: false, message: "The mail provider did not accept that test." };
  }
  return {
    ok: true,
    delivered: result.mode === "resend",
    message:
      result.mode === "resend"
        ? `Test sent to ${toEmail}.`
        : `Test logged for ${toEmail}. RESEND_API_KEY is not set, so nothing left the server.`,
  };
}

export async function createOutreachCampaign(input: {
  name: string;
  templateId: string;
  prospectIds: string[];
  scheduledAt: string | null;
  userId: string;
}): Promise<
  | {
      ok: true;
      campaign: OutreachCampaignSummary;
      preview: OutreachRecipientPreview;
      liveSends: boolean;
    }
  | { ok: false; message: string }
> {
  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false, message: "Name this campaign." };
  const template = await loadTemplate(input.templateId);
  if (!template.ok) return template;
  const loaded = await loadProspectsByIds(input.prospectIds);
  if ("error" in loaded) return { ok: false, message: loaded.error };
  const { sendable, preview } = partitionRecipients(loaded);
  if (sendable.length === 0) {
    return {
      ok: false,
      message: "None of the selected prospects can receive this email.",
    };
  }

  const scheduled = parseSchedule(input.scheduledAt);
  if (scheduled === "invalid") {
    return { ok: false, message: "That schedule time is not valid." };
  }

  const live = outreachLiveSendsEnabled();
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };

  const now = new Date().toISOString();
  const status = scheduled ? "scheduled" : live ? "sending" : "sent";
  const { data, error } = await service
    .from("outreach_campaigns")
    .insert({
      name,
      template_id: template.id,
      template_name: template.name,
      status,
      delivery_mode: live ? "live" : "dry_run",
      scheduled_at: scheduled,
      started_at: scheduled ? null : now,
      completed_at: !scheduled && !live ? now : null,
      created_by: input.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: outreachStorageError(error?.message ?? "", "Could not create that campaign."),
    };
  }

  const campaignId = asText(data.id);
  for (let index = 0; index < sendable.length; index += 100) {
    const chunk = sendable.slice(index, index + 100);
    const { error: insertError } = await service.from("outreach_messages").insert(
      chunk.flatMap((prospect) =>
        prospect.email
          ? [
              {
        campaign_id: campaignId,
        prospect_id: prospect.id,
        to_email: prospect.email,
        subject: template.subject,
        status: live ? "queued" : "dry_run",
        sent_at: live ? null : now,
        error: live ? null : "Live sends are off.",
              },
            ]
          : []
      )
    );
    if (insertError) {
      return {
        ok: false,
        message: outreachStorageError(
          insertError.message,
          "Could not queue recipients. No further emails were added."
        ),
      };
    }
  }

  if (!live && !scheduled) {
    await service.from("outreach_events").insert(
      sendable.slice(0, 200).map((prospect) => ({
        prospect_id: prospect.id,
        campaign_id: campaignId,
        event_type: "dry_run",
        detail: { campaign: name },
      }))
    );
  }

  const campaigns = await listOutreachCampaigns();
  const campaign = campaigns.ok
    ? campaigns.campaigns.find((item) => item.id === campaignId)
    : null;

  return {
    ok: true,
    preview,
    liveSends: live,
    campaign:
      campaign ?? {
        id: campaignId,
        name,
        templateId: template.id,
        templateName: template.name,
        status,
        deliveryMode: live ? "live" : "dry_run",
        scheduledAt: scheduled,
        startedAt: scheduled ? null : now,
        completedAt: !scheduled && !live ? now : null,
        createdAt: now,
        stats: {
          ...EMPTY_STATS(),
          recipients: sendable.length,
          dryRun: live ? 0 : sendable.length,
          queued: live && !scheduled ? sendable.length : 0,
        },
      },
  };
}

function parseSchedule(value: string | null): string | null | "invalid" {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "invalid";
  if (date.getTime() <= Date.now() + 30_000) return null;
  return date.toISOString();
}

export async function listOutreachCampaigns(): Promise<
  | { ok: true; campaigns: OutreachCampaignSummary[]; liveSends: boolean }
  | { ok: false; message: string }
> {
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };
  const { data, error } = await service
    .from("outreach_campaigns")
    .select(
      "id, name, template_id, template_name, status, delivery_mode, scheduled_at, started_at, completed_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return {
      ok: false,
      message: outreachStorageError(error.message, "Could not load campaigns."),
    };
  }

  const campaigns = data ?? [];
  const stats = await loadStats(campaigns.map((row) => asText(row.id)));
  return {
    ok: true,
    liveSends: outreachLiveSendsEnabled(),
    campaigns: campaigns.map((row) => ({
      id: asText(row.id),
      name: asText(row.name),
      templateId: asText(row.template_id) || null,
      templateName: asText(row.template_name),
      status: asText(row.status),
      deliveryMode: row.delivery_mode === "live" ? "live" : "dry_run",
      scheduledAt: asText(row.scheduled_at) || null,
      startedAt: asText(row.started_at) || null,
      completedAt: asText(row.completed_at) || null,
      createdAt: asText(row.created_at),
      stats: stats.get(asText(row.id)) ?? EMPTY_STATS(),
    })),
  };
}

async function loadStats(campaignIds: string[]): Promise<Map<string, OutreachCampaignStats>> {
  const map = new Map<string, OutreachCampaignStats>();
  for (const id of campaignIds) map.set(id, EMPTY_STATS());
  if (campaignIds.length === 0) return map;
  const service = outreachService();
  if (!service) return map;

  const messages = await selectInChunks(campaignIds, async (chunk) => {
    const { data, error } = await service
      .from("outreach_messages")
      .select("campaign_id, status, prospect_id")
      .in("campaign_id", chunk);
    if (error) return [];
    return data ?? [];
  });

  const prospectIds = [
    ...new Set(messages.map((row) => asText(row.prospect_id)).filter(Boolean)),
  ];
  const statusByProspect = new Map<string, string>();
  if (prospectIds.length > 0) {
    const prospects = await selectInChunks(prospectIds, async (chunk) => {
      const { data } = await service
        .from("outreach_prospects")
        .select("id, status")
        .in("id", chunk);
      return data ?? [];
    });
    for (const row of prospects) statusByProspect.set(asText(row.id), asText(row.status));
  }

  const seenUnsub = new Map<string, Set<string>>();
  const seenReply = new Map<string, Set<string>>();
  const seenSignup = new Map<string, Set<string>>();

  for (const row of messages) {
    const campaignId = asText(row.campaign_id);
    const stats = map.get(campaignId);
    if (!stats) continue;
    stats.recipients += 1;
    const status = asText(row.status);
    if (status === "sent" || status === "delivered") stats.sent += 1;
    if (status === "delivered") stats.delivered += 1;
    if (status === "bounced") stats.bounced += 1;
    if (status === "failed") stats.failed += 1;
    if (status === "queued" || status === "sending") stats.queued += 1;
    if (status === "dry_run") stats.dryRun += 1;
    const prospectStatus = statusByProspect.get(asText(row.prospect_id));
    const prospectId = asText(row.prospect_id);
    if (prospectStatus === "unsubscribed") {
      const bucket = seenUnsub.get(campaignId) ?? new Set<string>();
      bucket.add(prospectId);
      seenUnsub.set(campaignId, bucket);
    }
    if (prospectStatus === "replied") {
      const bucket = seenReply.get(campaignId) ?? new Set<string>();
      bucket.add(prospectId);
      seenReply.set(campaignId, bucket);
    }
    if (prospectStatus === "signed_up") {
      const bucket = seenSignup.get(campaignId) ?? new Set<string>();
      bucket.add(prospectId);
      seenSignup.set(campaignId, bucket);
    }
  }

  for (const [campaignId, stats] of map) {
    stats.unsubscribed = seenUnsub.get(campaignId)?.size ?? 0;
    stats.replies = seenReply.get(campaignId)?.size ?? 0;
    stats.signups = seenSignup.get(campaignId)?.size ?? 0;
  }
  return map;
}

export async function processOutreachCampaign(
  campaignId: string
): Promise<
  | {
      ok: true;
      processed: number;
      remaining: number;
      status: string;
      paused: boolean;
    }
  | { ok: false; message: string }
> {
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };
  const { data: campaign, error } = await service
    .from("outreach_campaigns")
    .select("id, name, template_id, status, delivery_mode, scheduled_at")
    .eq("id", campaignId)
    .maybeSingle();
  if (error || !campaign) {
    return { ok: false, message: "That campaign is gone." };
  }
  if (
    campaign.status === "cancelled" ||
    campaign.status === "sent" ||
    campaign.status === "paused" ||
    campaign.status === "draft"
  ) {
    return {
      ok: true,
      processed: 0,
      remaining: 0,
      status: asText(campaign.status),
      paused: campaign.status === "paused",
    };
  }
  if (campaign.status === "scheduled") {
    const when = new Date(asText(campaign.scheduled_at)).getTime();
    if (Number.isNaN(when) || when > Date.now()) {
      return {
        ok: true,
        processed: 0,
        remaining: 0,
        status: "scheduled",
        paused: false,
      };
    }
    await service
      .from("outreach_campaigns")
      .update({ status: "sending", started_at: new Date().toISOString() })
      .eq("id", campaignId);
  }

  if (campaign.delivery_mode !== "live" || !outreachLiveSendsEnabled()) {
    if (campaign.delivery_mode === "live" && !outreachLiveSendsEnabled()) {
      await service
        .from("outreach_campaigns")
        .update({ status: "paused" })
        .eq("id", campaignId);
      return { ok: true, processed: 0, remaining: 0, status: "paused", paused: true };
    }
    return { ok: true, processed: 0, remaining: 0, status: asText(campaign.status), paused: false };
  }

  const template = await loadTemplate(asText(campaign.template_id));
  if (!template.ok) return template;

  const { data: queued, error: queueError } = await service
    .from("outreach_messages")
    .select("id, prospect_id, to_email")
    .eq("campaign_id", campaignId)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(OUTREACH_BATCH_SIZE);

  if (queueError) {
    return { ok: false, message: "Could not read the send queue." };
  }

  const batch = queued ?? [];
  let processed = 0;
  for (const message of batch) {
    const claimed = await service
      .from("outreach_messages")
      .update({ status: "sending" })
      .eq("id", message.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (!claimed.data) continue;

    const prospectRows = await loadProspectsByIds([asText(message.prospect_id)]);
    const prospect = Array.isArray(prospectRows) ? prospectRows[0] : null;
    if (!prospect || !prospectCanReceiveEmail(prospect)) {
      await service
        .from("outreach_messages")
        .update({
          status: "skipped",
          error: "Skipped. This contact can no longer be emailed.",
        })
        .eq("id", message.id);
      processed += 1;
      continue;
    }

    const rendered = renderProspectOutreachEmail({
      subject: template.subject,
      body: template.body,
      name: prospect.name,
      business: prospect.business,
      toEmail: asText(message.to_email),
    });

    const result = await sendOutboundEmail({
      to: asText(message.to_email),
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      from: "SMOAC <team@smoac.com>",
      replyTo: "team@smoac.com",
      kind: "outreach",
      tags: [
        { name: "kind", value: "outreach_campaign" },
        { name: "campaign", value: campaignId },
      ],
    });

    const sentAt = new Date().toISOString();
    if (!result.success || result.mode !== "resend") {
      await service
        .from("outreach_messages")
        .update({
          status: "failed",
          error:
            result.mode !== "resend"
              ? "RESEND_API_KEY is not set."
              : "The mail provider did not accept this send.",
          subject: rendered.subject,
          sent_at: sentAt,
        })
        .eq("id", message.id);
      await service.from("outreach_events").insert({
        prospect_id: prospect.id,
        campaign_id: campaignId,
        message_id: message.id,
        event_type: "email_failed",
        detail: { subject: rendered.subject },
      });
      processed += 1;
      if (result.mode !== "resend") {
        await service.from("outreach_campaigns").update({ status: "paused" }).eq("id", campaignId);
        break;
      }
      await sleep(OUTREACH_BATCH_DELAY_MS);
      continue;
    }

    await service
      .from("outreach_messages")
      .update({
        status: "sent",
        provider_id: result.providerId ?? null,
        subject: rendered.subject,
        error: null,
        sent_at: sentAt,
      })
      .eq("id", message.id);

    const keep = new Set([
      "replied",
      "interested",
      "signed_up",
      "not_interested",
      "unsubscribed",
      "bounced",
    ]);
    if (!keep.has(prospect.status)) {
      await service
        .from("outreach_prospects")
        .update({ status: "email_sent", last_contacted_at: sentAt })
        .eq("id", prospect.id);
    } else {
      await service
        .from("outreach_prospects")
        .update({ last_contacted_at: sentAt })
        .eq("id", prospect.id);
    }

    await service.from("outreach_events").insert({
      prospect_id: prospect.id,
      campaign_id: campaignId,
      message_id: message.id,
      event_type: "email_sent",
      detail: { subject: rendered.subject, campaign: asText(campaign.name) },
    });
    processed += 1;
    await sleep(OUTREACH_BATCH_DELAY_MS);
  }

  const remainingQuery = await service
    .from("outreach_messages")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "queued");
  const remaining = remainingQuery.count ?? 0;
  let status = "sending";
  if (remaining === 0) {
    status = "sent";
    await service
      .from("outreach_campaigns")
      .update({ status: "sent", completed_at: new Date().toISOString() })
      .eq("id", campaignId)
      .neq("status", "paused");
  }
  const latest = await service
    .from("outreach_campaigns")
    .select("status")
    .eq("id", campaignId)
    .maybeSingle();
  status = asText(latest.data?.status) || status;

  return {
    ok: true,
    processed,
    remaining: status === "paused" ? remaining : remaining,
    status,
    paused: status === "paused",
  };
}

export async function cancelOutreachCampaign(
  campaignId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };
  const { error } = await service
    .from("outreach_campaigns")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (error) return { ok: false, message: "Could not stop that campaign." };
  await service
    .from("outreach_messages")
    .update({ status: "skipped", error: "Campaign stopped." })
    .eq("campaign_id", campaignId)
    .in("status", ["queued", "sending"]);
  return { ok: true };
}

export async function resumeOutreachCampaign(
  campaignId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!outreachLiveSendsEnabled()) {
    return {
      ok: false,
      message: "Live sends are still off. Set OUTREACH_LIVE_SENDS=true before resuming.",
    };
  }
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };
  const { error } = await service
    .from("outreach_campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId)
    .eq("status", "paused");
  if (error) return { ok: false, message: "Could not resume that campaign." };
  return { ok: true };
}

/** Cron drain. Sends at most a few batches so the function stays inside its time limit. */
export async function processDueOutreachCampaigns(): Promise<{ processed: number }> {
  const service = outreachService();
  if (!service || !outreachLiveSendsEnabled()) return { processed: 0 };
  const { data } = await service
    .from("outreach_campaigns")
    .select("id, status, scheduled_at")
    .in("status", ["sending", "scheduled"])
    .eq("delivery_mode", "live")
    .limit(10);

  let processed = 0;
  const started = Date.now();
  for (const row of data ?? []) {
    if (Date.now() - started > 40_000) break;
    if (row.status === "scheduled") {
      const when = new Date(asText(row.scheduled_at)).getTime();
      if (Number.isNaN(when) || when > Date.now()) continue;
    }
    const result = await processOutreachCampaign(asText(row.id));
    if (result.ok) processed += result.processed;
    if (result.ok && result.remaining > 0 && Date.now() - started < 40_000) {
      const more = await processOutreachCampaign(asText(row.id));
      if (more.ok) processed += more.processed;
    }
  }
  return { processed };
}

export async function applyOutreachProviderEvent(input: {
  providerId: string;
  type: "delivered" | "bounced" | "complained";
}): Promise<void> {
  const service = outreachService();
  if (!service || !input.providerId) return;
  const { data } = await service
    .from("outreach_messages")
    .select("id, prospect_id, campaign_id, to_email")
    .eq("provider_id", input.providerId)
    .maybeSingle();
  if (!data) return;

  if (input.type === "delivered") {
    await service.from("outreach_messages").update({ status: "delivered" }).eq("id", data.id);
    await service.from("outreach_events").insert({
      prospect_id: data.prospect_id,
      campaign_id: data.campaign_id,
      message_id: data.id,
      event_type: "delivered",
      detail: {},
    });
    return;
  }

  if (input.type === "bounced") {
    await service.from("outreach_messages").update({ status: "bounced" }).eq("id", data.id);
    await service
      .from("outreach_prospects")
      .update({ status: "bounced" })
      .eq("id", data.prospect_id)
      .neq("status", "unsubscribed");
    await service.from("outreach_events").insert({
      prospect_id: data.prospect_id,
      campaign_id: data.campaign_id,
      message_id: data.id,
      event_type: "bounced",
      detail: {},
    });
    return;
  }

  await service.from("outreach_messages").update({ status: "skipped", error: "Complained." }).eq("id", data.id);
  const email = asText(data.to_email);
  if (email) await markOutreachUnsubscribed(email);
}

import {
  asText,
  outreachService,
  outreachStorageError,
  selectInChunks,
} from "@/lib/outreach/storage";

export interface OutreachCampaignTile {
  label: string;
  value: number;
  rate: number | null;
  caption: string;
  tone?: "good" | "warn";
}

export interface OutreachCampaignFunnelStep {
  label: string;
  count: number;
  hint: string;
}

export type OutreachEngagement = "clicked" | "opened" | "";

export interface OutreachCampaignPerson {
  id: string;
  name: string;
  email: string;
  business: string;
  status: string;
  engagement: OutreachEngagement;
  note: string;
}

export interface OutreachCampaignGroup {
  key: string;
  title: string;
  detail: string;
  total: number;
  emails: string[];
  people: OutreachCampaignPerson[];
}

export interface OutreachCampaignSegmentRow {
  label: string;
  emailed: number;
  opened: number;
  clicked: number;
  responded: number;
  signedUp: number;
  responseRate: number | null;
}

export interface OutreachCampaignSegment {
  key: string;
  title: string;
  rows: OutreachCampaignSegmentRow[];
}

export interface OutreachCampaignTiming {
  medianOpen: string | null;
  medianResponse: string | null;
  buckets: Array<{ label: string; opens: number; responses: number }>;
}

export interface OutreachCampaignLink {
  url: string;
  label: string;
  clicks: number;
  people: number;
}

export interface OutreachCampaignReportData {
  id: string;
  name: string;
  templateName: string;
  status: string;
  statusLabel: string;
  deliveryMode: "live" | "dry_run";
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  read: string;
  trackingNote: string;
  tiles: OutreachCampaignTile[];
  funnel: OutreachCampaignFunnelStep[];
  health: Array<{ label: string; count: number }>;
  groups: OutreachCampaignGroup[];
  segments: OutreachCampaignSegment[];
  timing: OutreachCampaignTiming | null;
  links: OutreachCampaignLink[];
}

const PERSON_LIMIT = 200;
const SEGMENT_LIMIT = 12;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  paused: "Paused",
  cancelled: "Stopped",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Added by hand",
  import: "Spreadsheet import",
  csv: "Spreadsheet import",
};

const RESPONDED_STATUSES = new Set(["replied", "interested", "signed_up"]);

const TIMING_BUCKETS: Array<{ label: string; maxMs: number }> = [
  { label: "First hour", maxMs: HOUR },
  { label: "Same day", maxMs: DAY },
  { label: "Day 2", maxMs: 2 * DAY },
  { label: "Days 3–6", maxMs: 7 * DAY },
  { label: "A week or later", maxMs: Number.POSITIVE_INFINITY },
];

type Bucket = "follow_up" | "talking" | "signed_up" | "leave_off" | "not_sent";

function percent(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function time(value: unknown): number | null {
  const text = asText(value);
  if (!text) return null;
  const ms = new Date(text).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatWait(ms: number | null): string | null {
  if (ms == null) return null;
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return plural(minutes, "minute", "minutes");
  const hours = Math.round(ms / HOUR);
  if (hours < 48) return plural(hours, "hour", "hours");
  return plural(Math.round(ms / DAY), "day", "days");
}

function linkLabel(url: string): string {
  try {
    const parsed = new URL(url);
    if (/unsubscribe/i.test(parsed.pathname)) return "Unsubscribe link";
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}

function bucketFor(messageStatus: string, prospectStatus: string): Bucket {
  if (prospectStatus === "signed_up") return "signed_up";
  if (
    prospectStatus === "not_interested" ||
    prospectStatus === "unsubscribed" ||
    prospectStatus === "bounced" ||
    messageStatus === "bounced"
  ) {
    return "leave_off";
  }
  if (prospectStatus === "replied" || prospectStatus === "interested") return "talking";
  if (
    messageStatus === "failed" ||
    messageStatus === "skipped" ||
    messageStatus === "queued" ||
    messageStatus === "sending"
  ) {
    return "not_sent";
  }
  return "follow_up";
}

function personNote(messageStatus: string, error: string): string {
  if (!error) return "";
  if (messageStatus === "failed" || messageStatus === "skipped" || messageStatus === "bounced") {
    return error;
  }
  return "";
}

const ENGAGEMENT_RANK: Record<OutreachEngagement, number> = { clicked: 0, opened: 1, "": 2 };

function buildRead(input: {
  live: boolean;
  recipients: number;
  accepted: number;
  bounced: number;
  failed: number;
  waiting: number;
  opened: number;
  clicked: number;
  responded: number;
  signedUp: number;
  followUp: number;
  warmFollowUp: number;
  leaveOff: number;
  bestSegment: string | null;
  trackingLive: boolean;
}): string {
  if (input.recipients === 0) return "This campaign has no recipients.";
  if (!input.live) {
    const people = input.recipients === 1 ? "person is" : "people are";
    return `${input.recipients} ${people} recorded on this campaign. Live sending was off, so no email went out.`;
  }

  const sentences: string[] = [];
  const emailWord = input.recipients === 1 ? "email was" : "emails were";
  sentences.push(`${input.accepted} of ${input.recipients} ${emailWord} accepted.`);
  if (input.waiting > 0) {
    sentences.push(
      input.waiting === 1
        ? "1 is still waiting to send."
        : `${input.waiting} are still waiting to send.`
    );
  }
  const problems: string[] = [];
  if (input.bounced > 0) problems.push(`${input.bounced} bounced`);
  if (input.failed > 0) problems.push(`${input.failed} failed`);
  if (problems.length > 0) sentences.push(`${joinAnd(problems)}.`);

  if (input.trackingLive && input.accepted > 0) {
    const openRate = percent(input.opened, input.accepted) ?? 0;
    const clickRate = percent(input.clicked, input.accepted) ?? 0;
    sentences.push(`${openRate}% opened and ${clickRate}% clicked.`);
  }

  if (input.responded > 0 || input.signedUp > 0) {
    const outcomes: string[] = [];
    if (input.responded > 0) outcomes.push(`${plural(input.responded, "person", "people")} responded`);
    if (input.signedUp > 0) outcomes.push(`${input.signedUp} signed up`);
    sentences.push(`${joinAnd(outcomes)}.`);
  } else if (input.accepted > 0 && input.waiting === 0) {
    sentences.push("No replies or signups are marked yet.");
  }
  if (input.bestSegment) sentences.push(input.bestSegment);
  if (input.followUp > 0) {
    const warm =
      input.warmFollowUp > 0
        ? ` Start with the ${input.warmFollowUp} who opened or clicked.`
        : "";
    sentences.push(
      `${plural(input.followUp, "person is", "people are")} ready for a follow-up.${warm}`
    );
  }
  if (input.leaveOff > 0) {
    sentences.push(`Leave ${plural(input.leaveOff, "person", "people")} off the next list.`);
  }
  return sentences.join(" ");
}

interface SegmentTally {
  emailed: number;
  opened: number;
  clicked: number;
  responded: number;
  signedUp: number;
}

function emptyTally(): SegmentTally {
  return { emailed: 0, opened: 0, clicked: 0, responded: 0, signedUp: 0 };
}

function segmentRows(map: Map<string, SegmentTally>): OutreachCampaignSegmentRow[] {
  return [...map.entries()]
    .map(([label, tally]) => ({
      label,
      ...tally,
      responseRate: percent(tally.responded, tally.emailed),
    }))
    .sort((a, b) => b.emailed - a.emailed || a.label.localeCompare(b.label))
    .slice(0, SEGMENT_LIMIT);
}

async function loadMessages(campaignId: string): Promise<
  { rows: Array<Record<string, unknown>>; tracking: boolean } | { error: string }
> {
  const service = outreachService();
  if (!service) return { error: "Outreach storage is not connected." };
  const base = "id, prospect_id, to_email, status, error, sent_at";
  let tracking = true;
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; from < 20000; from += 1000) {
    const columns = tracking
      ? `${base}, delivered_at, opened_at, clicked_at, open_count, click_count`
      : base;
    const { data, error } = await service
      .from("outreach_messages")
      .select(columns)
      .eq("campaign_id", campaignId)
      .range(from, from + 999);
    if (error && tracking && /opened_at|clicked_at|delivered_at|_count/i.test(error.message)) {
      tracking = false;
      from -= 1000;
      continue;
    }
    if (error) return { error: "Could not load the people on this campaign." };
    const page = (data ?? []) as unknown as Array<Record<string, unknown>>;
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return { rows, tracking };
}

export async function loadOutreachCampaignReport(
  campaignId: string
): Promise<{ ok: true; report: OutreachCampaignReportData } | { ok: false; message: string }> {
  const service = outreachService();
  if (!service) return { ok: false, message: "Outreach storage is not connected." };

  const { data: campaign, error } = await service
    .from("outreach_campaigns")
    .select(
      "id, name, template_name, status, delivery_mode, scheduled_at, started_at, completed_at, created_at"
    )
    .eq("id", campaignId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: outreachStorageError(error.message, "Could not load that campaign."),
    };
  }
  if (!campaign) return { ok: false, message: "That campaign is gone." };

  const loaded = await loadMessages(campaignId);
  if ("error" in loaded) return { ok: false, message: loaded.error };
  const { rows: messages, tracking } = loaded;

  const prospectIds = [
    ...new Set(messages.map((row) => asText(row.prospect_id)).filter(Boolean)),
  ];
  const prospects = prospectIds.length
    ? await selectInChunks(prospectIds, async (chunk) => {
        const { data } = await service
          .from("outreach_prospects")
          .select("id, name, email, business, category, source, status")
          .in("id", chunk);
        return data ?? [];
      })
    : [];
  const prospectById = new Map(prospects.map((row) => [asText(row.id), row]));

  const since = asText(campaign.started_at) || asText(campaign.created_at);
  const responseEvents = prospectIds.length
    ? await selectInChunks(prospectIds, async (chunk) => {
        const { data } = await service
          .from("outreach_events")
          .select("prospect_id, event_type, detail, created_at")
          .in("prospect_id", chunk)
          .in("event_type", ["status_changed", "signup"])
          .gte("created_at", since)
          .order("created_at", { ascending: true });
        return data ?? [];
      })
    : [];
  const firstResponseAt = new Map<string, number>();
  for (const row of responseEvents) {
    const detail = (row.detail ?? {}) as Record<string, unknown>;
    const responded =
      row.event_type === "signup" || RESPONDED_STATUSES.has(asText(detail.to));
    const at = time(row.created_at);
    const id = asText(row.prospect_id);
    if (!responded || at == null || firstResponseAt.has(id)) continue;
    firstResponseAt.set(id, at);
  }

  const { data: clickEvents } = await service
    .from("outreach_events")
    .select("prospect_id, detail")
    .eq("campaign_id", campaignId)
    .eq("event_type", "clicked")
    .limit(5000);

  const counts = {
    queued: 0,
    sending: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    bounced: 0,
    dryRun: 0,
    skipped: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    interested: 0,
    signedUp: 0,
    responded: 0,
    unsubscribed: 0,
    notInterested: 0,
  };

  const grouped = new Map<Bucket, OutreachCampaignPerson[]>();
  for (const key of ["follow_up", "talking", "signed_up", "leave_off", "not_sent"] as const) {
    grouped.set(key, []);
  }
  const byCategory = new Map<string, SegmentTally>();
  const bySource = new Map<string, SegmentTally>();
  const openWaits: number[] = [];
  const responseWaits: number[] = [];
  const timingBuckets = TIMING_BUCKETS.map((bucket) => ({
    label: bucket.label,
    opens: 0,
    responses: 0,
  }));
  const bucketIndex = (ms: number) =>
    Math.max(
      0,
      TIMING_BUCKETS.findIndex((bucket) => ms < bucket.maxMs)
    );

  for (const row of messages) {
    const messageStatus = asText(row.status);
    if (messageStatus === "queued") counts.queued += 1;
    else if (messageStatus === "sending") counts.sending += 1;
    else if (messageStatus === "sent") counts.sent += 1;
    else if (messageStatus === "delivered") counts.delivered += 1;
    else if (messageStatus === "failed") counts.failed += 1;
    else if (messageStatus === "bounced") counts.bounced += 1;
    else if (messageStatus === "dry_run") counts.dryRun += 1;
    else if (messageStatus === "skipped") counts.skipped += 1;

    const prospectId = asText(row.prospect_id);
    const prospect = prospectById.get(prospectId);
    const prospectStatus = asText(prospect?.status) || "not_contacted";
    const emailed = messageStatus === "sent" || messageStatus === "delivered";
    const opened = emailed && Boolean(asText(row.opened_at));
    const clicked = emailed && Boolean(asText(row.clicked_at));
    const responded = emailed && RESPONDED_STATUSES.has(prospectStatus);
    const signedUp = prospectStatus === "signed_up";

    if (opened) counts.opened += 1;
    if (clicked) counts.clicked += 1;
    if (responded) counts.responded += 1;
    if (prospectStatus === "replied") counts.replied += 1;
    if (prospectStatus === "interested") counts.interested += 1;
    if (signedUp) counts.signedUp += 1;
    if (prospectStatus === "unsubscribed") counts.unsubscribed += 1;
    if (prospectStatus === "not_interested") counts.notInterested += 1;

    if (emailed) {
      const category = asText(prospect?.category).trim() || "No category";
      const sourceKey = asText(prospect?.source).trim() || "manual";
      const source = SOURCE_LABELS[sourceKey] ?? sourceKey;
      for (const [map, key] of [
        [byCategory, category],
        [bySource, source],
      ] as const) {
        const tally = map.get(key) ?? emptyTally();
        tally.emailed += 1;
        if (opened) tally.opened += 1;
        if (clicked) tally.clicked += 1;
        if (responded) tally.responded += 1;
        if (signedUp) tally.signedUp += 1;
        map.set(key, tally);
      }

      const sentAt = time(row.sent_at);
      const openedAt = time(row.opened_at);
      const respondedAt = firstResponseAt.get(prospectId) ?? null;
      if (sentAt != null && openedAt != null && openedAt >= sentAt) {
        openWaits.push(openedAt - sentAt);
        timingBuckets[bucketIndex(openedAt - sentAt)].opens += 1;
      }
      if (sentAt != null && respondedAt != null && respondedAt >= sentAt) {
        responseWaits.push(respondedAt - sentAt);
        timingBuckets[bucketIndex(respondedAt - sentAt)].responses += 1;
      }
    }

    const bucket = bucketFor(messageStatus, prospectStatus);
    const email = asText(prospect?.email) || asText(row.to_email);
    const name = asText(prospect?.name) || email || "Unnamed";
    grouped.get(bucket)?.push({
      id: prospectId || asText(row.id),
      name,
      email,
      business: asText(prospect?.business),
      status: prospectStatus,
      engagement: clicked ? "clicked" : opened ? "opened" : "",
      note: personNote(messageStatus, asText(row.error)),
    });
  }

  for (const people of grouped.values()) {
    people.sort(
      (a, b) =>
        ENGAGEMENT_RANK[a.engagement] - ENGAGEMENT_RANK[b.engagement] ||
        a.name.localeCompare(b.name) ||
        a.email.localeCompare(b.email)
    );
  }

  const live = campaign.delivery_mode === "live";
  const recipients = messages.length;
  const accepted = counts.sent + counts.delivered;
  const waiting = counts.queued + counts.sending;
  const followUpPeople = grouped.get("follow_up") ?? [];
  const followUp = followUpPeople.length;
  const warmFollowUp = followUpPeople.filter((person) => person.engagement).length;
  const leaveOff = grouped.get("leave_off")?.length ?? 0;
  const webhookSeen = counts.delivered + counts.bounced + counts.opened > 0;
  const trackingLive = live && tracking && webhookSeen;
  const deliveryPending = live && accepted > 0 && !webhookSeen;
  const outcomeBase = live ? accepted : recipients;

  const categoryRows = segmentRows(byCategory);
  const sourceRows = segmentRows(bySource);
  const segments: OutreachCampaignSegment[] = [];
  if (categoryRows.length > 0) {
    segments.push({ key: "category", title: "By category", rows: categoryRows });
  }
  if (sourceRows.length > 1) {
    segments.push({ key: "source", title: "By source", rows: sourceRows });
  }

  const ranked = categoryRows
    .filter((row) => row.emailed >= 3 && row.label !== "No category" && row.responded > 0)
    .sort((a, b) => (b.responseRate ?? 0) - (a.responseRate ?? 0));
  const bestSegment =
    categoryRows.length > 1 && ranked[0]
      ? `${ranked[0].label} responded best at ${ranked[0].responseRate}%.`
      : null;

  const linkMap = new Map<string, { clicks: number; people: Set<string> }>();
  for (const row of clickEvents ?? []) {
    const url = asText((row.detail as Record<string, unknown> | null)?.link);
    if (!url) continue;
    const entry = linkMap.get(url) ?? { clicks: 0, people: new Set<string>() };
    entry.clicks += 1;
    entry.people.add(asText(row.prospect_id));
    linkMap.set(url, entry);
  }
  const links = [...linkMap.entries()]
    .map(([url, entry]) => ({
      url,
      label: linkLabel(url),
      clicks: entry.clicks,
      people: entry.people.size,
    }))
    .sort((a, b) => b.people - a.people || b.clicks - a.clicks)
    .slice(0, 8);

  const timing: OutreachCampaignTiming | null =
    live && (openWaits.length > 0 || responseWaits.length > 0)
      ? {
          medianOpen: formatWait(median(openWaits)),
          medianResponse: formatWait(median(responseWaits)),
          buckets: timingBuckets,
        }
      : null;

  const groupMeta: Array<{
    key: Bucket;
    title: string;
    detail: string;
    always: boolean;
  }> = [
    {
      key: "follow_up",
      title: live ? "Follow up next" : "On the list",
      detail: live
        ? "Emailed with no reply yet. People who clicked or opened are listed first."
        : "These contacts were saved on the campaign. Nothing was delivered.",
      always: true,
    },
    {
      key: "talking",
      title: "Already talking",
      detail: "Marked Replied or Interested. Write to them personally before the next blast.",
      always: false,
    },
    {
      key: "signed_up",
      title: "On Smoac",
      detail: "A specialist application matched their email.",
      always: false,
    },
    {
      key: "leave_off",
      title: "Leave off the next list",
      detail: "Bounced, unsubscribed, or not interested.",
      always: true,
    },
    {
      key: "not_sent",
      title: "Did not go out",
      detail: "Failed, skipped, or still queued. Check these before you send again.",
      always: false,
    },
  ];

  const groups: OutreachCampaignGroup[] = groupMeta.flatMap((meta) => {
    const people = grouped.get(meta.key) ?? [];
    if (!meta.always && people.length === 0) return [];
    return [
      {
        key: meta.key,
        title: meta.title,
        detail: meta.detail,
        total: people.length,
        emails: people.map((person) => person.email).filter((email) => email.includes("@")),
        people: people.slice(0, PERSON_LIMIT),
      },
    ];
  });

  const status = asText(campaign.status);
  const health = [
    { label: "Queued", count: counts.queued },
    { label: "Sending", count: counts.sending },
    { label: "Awaiting delivery", count: counts.sent },
    { label: "Delivered", count: counts.delivered },
    { label: "Bounced", count: counts.bounced },
    { label: "Failed", count: counts.failed },
    { label: "Skipped", count: counts.skipped },
    { label: "Test mode", count: counts.dryRun },
  ].filter((item) => item.count > 0);

  const trackingNote = !live
    ? "This run recorded the list and did not deliver email."
    : !tracking
      ? "Opens and clicks start counting after apply-outreach-message-engagement-safe.sql runs. Replies count when you mark a contact Replied or Interested."
      : deliveryPending
        ? "Delivered, opened, and clicked stay at 0 until the Resend webhook is connected with open and click tracking on. Replies count when you mark a contact Replied or Interested."
        : "Opens run high because Apple Mail loads images for privacy. Clicks and replies are the stronger signal. Replies count when you mark a contact Replied or Interested.";

  const trackedRate = (count: number) => (trackingLive ? percent(count, accepted) : null);
  const trackedCaption = (count: number, verb: string) =>
    trackingLive ? `${count} ${verb}` : tracking ? "waiting on Resend" : "not tracked yet";

  const respondedParts = [
    counts.replied > 0 ? `${counts.replied} replied` : "",
    counts.interested > 0 ? `${counts.interested} interested` : "",
    counts.signedUp > 0 ? `${counts.signedUp} signed up` : "",
  ].filter(Boolean);

  return {
    ok: true,
    report: {
      id: asText(campaign.id),
      name: asText(campaign.name) || "Campaign",
      templateName: asText(campaign.template_name),
      status,
      statusLabel: CAMPAIGN_STATUS_LABELS[status] ?? status,
      deliveryMode: live ? "live" : "dry_run",
      scheduledAt: asText(campaign.scheduled_at) || null,
      startedAt: asText(campaign.started_at) || null,
      completedAt: asText(campaign.completed_at) || null,
      createdAt: asText(campaign.created_at),
      read: buildRead({
        live,
        recipients,
        accepted,
        bounced: counts.bounced,
        failed: counts.failed,
        waiting,
        opened: counts.opened,
        clicked: counts.clicked,
        responded: counts.responded,
        signedUp: counts.signedUp,
        followUp,
        warmFollowUp,
        leaveOff,
        bestSegment,
        trackingLive,
      }),
      trackingNote,
      tiles: [
        {
          label: live ? "Accepted" : "Recorded",
          value: live ? accepted : counts.dryRun,
          rate: percent(live ? accepted : counts.dryRun, recipients),
          caption: live
            ? `${accepted} of ${recipients} on the list`
            : `${counts.dryRun} of ${recipients}, not delivered`,
        },
        {
          label: "Delivered",
          value: counts.delivered,
          rate: deliveryPending ? null : percent(counts.delivered, accepted),
          caption: deliveryPending ? "waiting on Resend" : `${counts.delivered} reached the inbox`,
        },
        {
          label: "Opened",
          value: counts.opened,
          rate: trackedRate(counts.opened),
          caption: trackedCaption(counts.opened, "opened"),
        },
        {
          label: "Clicked",
          value: counts.clicked,
          rate: trackedRate(counts.clicked),
          caption: trackedCaption(counts.clicked, "clicked a link"),
          tone: counts.clicked > 0 ? "good" : undefined,
        },
        {
          label: "Responded",
          value: counts.responded,
          rate: percent(counts.responded, outcomeBase),
          caption: respondedParts.length ? respondedParts.join(" · ") : "none marked yet",
          tone: counts.responded > 0 ? "good" : undefined,
        },
        {
          label: "Signed up",
          value: counts.signedUp,
          rate: percent(counts.signedUp, outcomeBase),
          caption: `${counts.signedUp} on Smoac`,
          tone: counts.signedUp > 0 ? "good" : undefined,
        },
        {
          label: "Bounced",
          value: counts.bounced,
          rate: percent(counts.bounced, accepted + counts.bounced),
          caption: `${counts.bounced} bad address${counts.bounced === 1 ? "" : "es"}`,
          tone: counts.bounced > 0 ? "warn" : undefined,
        },
        {
          label: "Unsubscribed",
          value: counts.unsubscribed,
          rate: percent(counts.unsubscribed, outcomeBase),
          caption: `${counts.unsubscribed} opted out`,
          tone: counts.unsubscribed > 0 ? "warn" : undefined,
        },
        {
          label: "Not interested",
          value: counts.notInterested,
          rate: percent(counts.notInterested, outcomeBase),
          caption: `${counts.notInterested} said no`,
        },
      ],
      funnel: [
        {
          label: "On the list",
          count: recipients,
          hint: "Everyone included in this campaign",
        },
        live
          ? { label: "Accepted", count: accepted, hint: "Resend took the email" }
          : { label: "Recorded", count: counts.dryRun, hint: "Saved here. Nothing was delivered" },
        {
          label: "Delivered",
          count: counts.delivered,
          hint: deliveryPending ? "Updates when Resend reports delivery" : "Reached the inbox",
        },
        { label: "Opened", count: counts.opened, hint: "Resend saw the email open" },
        { label: "Clicked", count: counts.clicked, hint: "Clicked a link in the email" },
        {
          label: "Responded",
          count: counts.responded,
          hint: "Marked Replied, Interested, or signed up",
        },
        {
          label: "Signed up",
          count: counts.signedUp,
          hint: "A specialist application matched their email",
        },
      ],
      health,
      groups,
      segments,
      timing,
      links,
    },
  };
}

/** Client-safe outreach labels and send rules. */

export const OUTREACH_STATUSES = [
  "not_contacted",
  "email_sent",
  "follow_up",
  "replied",
  "interested",
  "signed_up",
  "not_interested",
  "bounced",
  "unsubscribed",
  "instagram_only",
] as const;

export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const OUTREACH_STATUS_LABELS: Record<OutreachStatus, string> = {
  not_contacted: "Not Contacted",
  email_sent: "Email Sent",
  follow_up: "Follow Up",
  replied: "Replied",
  interested: "Interested",
  signed_up: "Signed Up",
  not_interested: "Not Interested",
  bounced: "Bounced",
  unsubscribed: "Unsubscribed",
  instagram_only: "Instagram Only",
};

/** Statuses that must never receive another campaign email. */
const BLOCKED_SEND_STATUSES = new Set<OutreachStatus>([
  "unsubscribed",
  "bounced",
  "not_interested",
  "instagram_only",
  "signed_up",
]);

export function isOutreachStatus(value: string): value is OutreachStatus {
  return (OUTREACH_STATUSES as readonly string[]).includes(value);
}

export function outreachStatusLabel(status: string): string {
  return isOutreachStatus(status) ? OUTREACH_STATUS_LABELS[status] : status;
}

export function prospectCanReceiveEmail(input: {
  email: string | null;
  status: string;
}): boolean {
  if (!input.email || !input.email.includes("@")) return false;
  if (!isOutreachStatus(input.status)) return false;
  return !BLOCKED_SEND_STATUSES.has(input.status);
}

export function instagramProgressLabel(input: {
  instagram: string;
  instagramTouches: number;
  instagramRepliedAt: string | null;
}): string {
  if (!input.instagram) return "";
  const times = input.instagramTouches;
  if (input.instagramRepliedAt) {
    return times > 0
      ? `Responded · ${times} message${times === 1 ? "" : "s"}`
      : "Responded";
  }
  if (times > 0) return `Messaged ${times}×`;
  return "Not messaged";
}

export function formatOutreachDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function outreachSkipReason(input: {
  email: string | null;
  status: string;
}): string | null {
  if (!input.email || !input.email.includes("@")) {
    return input.status === "instagram_only" ? "instagram_only" : "no_email";
  }
  if (input.status === "unsubscribed") return "unsubscribed";
  if (input.status === "bounced") return "bounced";
  if (input.status === "not_interested") return "not_interested";
  if (input.status === "signed_up") return "signed_up";
  if (input.status === "instagram_only") return "instagram_only";
  return null;
}

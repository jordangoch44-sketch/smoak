export type AdminEmailStatus = "draft" | "active" | "paused" | "scheduled" | "sent";

export type AdminEmailKind = "automated" | "one_time";

export type AdminEmailAudienceId =
  | "specialists_all"
  | "clients_all"
  | "specialists_pro"
  | "specialists_free"
  | "inactive";

export type AdminEmailTriggerKind =
  | "after_signup"
  | "profile_incomplete"
  | "weekly"
  | "one_time"
  | "custom";

export type AdminEmailAnalyticsRange = "7d" | "30d";

export interface AdminManagedEmail {
  id: string;
  name: string;
  subject: string;
  kind: AdminEmailKind;
  triggerKind: AdminEmailTriggerKind;
  triggerLabel: string;
  audienceIds: AdminEmailAudienceId[];
  status: AdminEmailStatus;
  preheader: string;
  eyebrow: string;
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  includeUnsubscribe: boolean;
  scheduledAt: string | null;
  lastSentAt: string | null;
  queuedForSend: boolean;
  sentCount: number;
  openRate: number | null;
  clickRate: number | null;
  unsubscribeRate: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEmailAnalyticsSnapshot {
  range: AdminEmailAnalyticsRange;
  emailsSent: number;
  openRate: number | null;
  clickRate: number | null;
  unsubscribeRate: number | null;
  bounceCount: number;
  complaintCount: number;
  points: Array<{
    label: string;
    sent: number;
    opened: number;
    clicked: number;
  }>;
}

export type AdminEmailRecipientStatus =
  | "queued"
  | "sent"
  | "failed"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "unsubscribed";

export interface AdminEmailRecipient {
  id: string;
  emailId: string;
  sendId: string | null;
  toEmail: string;
  toName: string;
  status: AdminEmailRecipientStatus;
  error: string | null;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  unsubscribedAt: string | null;
}

export interface AdminEmailDispatchResult {
  ok: boolean;
  message: string;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  queued: number;
}

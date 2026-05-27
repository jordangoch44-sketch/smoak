import type { AdminSectionId } from "@/lib/admin-sections";

/** Sections that support attention badges on the admin nav */
export type AdminNotifiableSectionId = Extract<
  AdminSectionId,
  "applications" | "specialists" | "clients" | "revenue"
>;

export type AdminSectionBadgeCounts = Record<AdminNotifiableSectionId, number>;

/** Placeholder billing/client issue — maps to Supabase alerts later */
export type AdminNotificationIssueKind =
  | "client_account"
  | "cancelled_tier"
  | "failed_billing"
  | "expired_placement"
  | "payment_failed";

export interface AdminNotificationIssue {
  id: string;
  section: "clients" | "revenue";
  kind: AdminNotificationIssueKind;
  label: string;
  /** Optional link target for future deep links */
  relatedId?: string;
}

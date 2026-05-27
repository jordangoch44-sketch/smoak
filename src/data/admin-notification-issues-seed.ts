import type { AdminNotificationIssue } from "@/types/admin-notifications";

/** DEV mock client/revenue alerts until Supabase `admin_notifications` exists */
export const ADMIN_NOTIFICATION_ISSUES_SEED: readonly AdminNotificationIssue[] = [
  {
    id: "client-inactive-alex",
    section: "clients",
    kind: "client_account",
    label: "Inactive client account — Alex R.",
    relatedId: "mock-client-003",
  },
  {
    id: "revenue-cancelled-elena",
    section: "revenue",
    kind: "cancelled_tier",
    label: "Cancelled tier — review Elena V.",
    relatedId: "elena-vasquez",
  },
  {
    id: "revenue-failed-billing-sophia",
    section: "revenue",
    kind: "failed_billing",
    label: "Failed billing placeholder — Sophia B.",
    relatedId: "sophia-bennett",
  },
  {
    id: "revenue-expired-spotlight-anthony",
    section: "revenue",
    kind: "expired_placement",
    label: "Expired homepage spotlight — Anthony B.",
    relatedId: "anthony-brooks",
  },
];

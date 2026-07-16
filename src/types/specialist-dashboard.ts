import type { Trainer } from "@/types";

export interface SpecialistLead {
  id: string;
  name: string;
  intent: string;
  receivedAt: string;
  /** Unread client message waiting for email follow-up */
  unread: boolean;
  clientEmail: string;
  actionLabel: string;
  topicLabels: string[];
  /** Short line for list subtitle / notification */
  messagePreview: string;
  /** Full inquiry body for portal detail */
  messageBody: string;
}

export interface SpecialistSubscription {
  plan: string;
  status: string;
  renewsOn: string;
  /** Full analytics + visibility insights (SMOAC Pro) */
  isPremium: boolean;
}

export interface SpecialistDashboardRanking {
  rank: number;
  listingTitle: string;
}

export interface SpecialistDashboardData {
  trainer: Trainer | undefined;
  ranking: SpecialistDashboardRanking | null;
  newLeads: SpecialistLead[];
  subscription: SpecialistSubscription;
}

export interface ProfileCompletionChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

/** Reserved slot IDs for upcoming specialist dashboard modules */
export const SPECIALIST_DASHBOARD_SLOTS = {
  premiumMemberships: "premium-memberships",
  boostedProfiles: "boosted-profiles",
  messaging: "messaging",
  bookingManagement: "booking-management",
  analyticsGraphs: "analytics-graphs",
  notifications: "notifications",
} as const;

export type SpecialistDashboardSlot =
  (typeof SPECIALIST_DASHBOARD_SLOTS)[keyof typeof SPECIALIST_DASHBOARD_SLOTS];

import { SPECIALIST_DASHBOARD_SLOTS } from "@/types/specialist-dashboard";

/** Upcoming specialist dashboard modules — wire UI when features ship */
export const SPECIALIST_DASHBOARD_FUTURE_SECTIONS = [
  {
    slot: SPECIALIST_DASHBOARD_SLOTS.premiumMemberships,
    title: "Premium memberships",
    description: "Manage SMOAC Pro tiers and billing.",
  },
  {
    slot: SPECIALIST_DASHBOARD_SLOTS.boostedProfiles,
    title: "Boosted profiles",
    description: "Campaigns for elevated search and ranking placement.",
  },
  {
    slot: SPECIALIST_DASHBOARD_SLOTS.messaging,
    title: "Messaging",
    description: "Client conversations and inquiry inbox.",
  },
  {
    slot: SPECIALIST_DASHBOARD_SLOTS.bookingManagement,
    title: "Booking management",
    description: "Availability, sessions, and calendar sync.",
  },
  {
    slot: SPECIALIST_DASHBOARD_SLOTS.analyticsGraphs,
    title: "Analytics graphs",
    description: "Trend charts for views, saves, and conversions.",
  },
  {
    slot: SPECIALIST_DASHBOARD_SLOTS.notifications,
    title: "Notifications",
    description: "Alerts for leads, reviews, and profile activity.",
  },
] as const;

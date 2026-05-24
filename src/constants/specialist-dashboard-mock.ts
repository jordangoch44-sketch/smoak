import type { ProfileCompletionChecklistItem } from "@/types/specialist-dashboard";
import type { SpecialistProfileAnalytics } from "@/types/specialist-analytics";

/** Demo specialist account until real auth profiles ship */
export const DEMO_SPECIALIST_ID = "anthony-brooks";

export const SPECIALIST_ANALYTICS_PERIOD_LABEL = "Last 30 days";

export const SPECIALIST_ANALYTICS_INSIGHT =
  "Profiles with complete photos, specialties, credentials, and booking availability receive more client interest.";

export const BOOST_VISIBILITY_MODAL = {
  title: "Boost Visibility",
  description:
    "Premium placement and boosted discovery are on the way. You'll soon be able to elevate your profile in search, rankings, and featured spots across SMOAC.",
} as const;

export const DEMO_SPECIALIST_LEADS = [
  {
    id: "lead-1",
    name: "Jordan M.",
    intent: "Sports performance · North Park",
    receivedAt: "2 hours ago",
  },
  {
    id: "lead-2",
    name: "Priya S.",
    intent: "Strength coaching · Mission Valley",
    receivedAt: "Yesterday",
  },
  {
    id: "lead-3",
    name: "Chris L.",
    intent: "HYROX prep · Hillcrest",
    receivedAt: "2 days ago",
  },
] as const;

export const DEMO_SPECIALIST_SUBSCRIPTION = {
  plan: "SMOAC Pro",
  status: "Active",
  renewsOn: "Jun 18, 2026",
} as const;

export const PROFILE_COMPLETION_CHECKLIST: ProfileCompletionChecklistItem[] = [
  { id: "photo", label: "Professional photo", done: true },
  { id: "specialties", label: "Specialties & credentials", done: true },
  { id: "transformations", label: "Add client transformations", done: false },
  { id: "booking", label: "Enable instant booking", done: false },
];

type DemoAnalyticsBase = Omit<
  SpecialistProfileAnalytics,
  "profileCompletionPercent" | "rankingPosition"
>;

export const DEMO_SPECIALIST_ANALYTICS: DemoAnalyticsBase = {
  periodLabel: SPECIALIST_ANALYTICS_PERIOD_LABEL,
  profileViews: 1284,
  searchAppearances: 3412,
  savedByClients: 47,
  contactClicks: 89,
  bookingClicks: 34,
  visibilityScore: 78,
  insightMessage: SPECIALIST_ANALYTICS_INSIGHT,
};

export const EMPTY_SPECIALIST_ANALYTICS: DemoAnalyticsBase = {
  periodLabel: SPECIALIST_ANALYTICS_PERIOD_LABEL,
  profileViews: 0,
  searchAppearances: 0,
  savedByClients: 0,
  contactClicks: 0,
  bookingClicks: 0,
  visibilityScore: 0,
  insightMessage: SPECIALIST_ANALYTICS_INSIGHT,
};

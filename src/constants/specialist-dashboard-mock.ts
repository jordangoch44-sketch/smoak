import type {
  SpecialistAnalyticsMetric,
  SpecialistGrowthInsight,
  SpecialistProfileAnalytics,
} from "@/types/specialist-analytics";
import type { SpecialistLead } from "@/types/specialist-dashboard";

/** Seed trainer id for demo analytics/leads UI only — not used for real specialist sessions */
export const DEMO_SPECIALIST_ID = "anthony-brooks";

/** Dev login dashboard id — isolated from public seed catalog */
export const DEV_SPECIALIST_DASHBOARD_ID = "dev-specialist-dashboard";

export const SPECIALIST_ANALYTICS_PERIOD_LABEL = "Last 30 days";

export const SPECIALIST_ANALYTICS_INSIGHT =
  "Profiles with complete photos, specialties, credentials, and booking availability receive more client interest.";

export const BOOST_VISIBILITY_MODAL = {
  title: "Boost Visibility",
  description:
    "Premium placement and boosted discovery are on the way. You'll soon be able to elevate your profile in search, rankings, and featured spots across SMOAC.",
} as const;

export const DEMO_SPECIALIST_LEADS: SpecialistLead[] = [
  {
    id: "lead-1",
    name: "Jordan M.",
    intent: "Sports performance",
    receivedAt: "2 hours ago",
    unread: true,
    clientEmail: "jordan.m@example.com",
    actionLabel: "Ask a question",
    topicLabels: ["Sports performance"],
    messagePreview: "Looking for North Park sessions twice a week.",
    messageBody:
      "New inquiry from Jordan M.\n\nInterested in: Ask a question\n\nTopics:\n- Sports performance\n\nMessage:\nLooking for North Park sessions twice a week.",
  },
  {
    id: "lead-2",
    name: "Priya S.",
    intent: "Strength coaching",
    receivedAt: "Yesterday",
    unread: false,
    clientEmail: "priya.s@example.com",
    actionLabel: "Book a consult",
    topicLabels: ["Strength coaching"],
    messagePreview: "Interested in Mission Valley availability.",
    messageBody:
      "New inquiry from Priya S.\n\nInterested in: Book a consult\n\nTopics:\n- Strength coaching\n\nMessage:\nInterested in Mission Valley availability.",
  },
  {
    id: "lead-3",
    name: "Chris L.",
    intent: "HYROX prep",
    receivedAt: "2 days ago",
    unread: false,
    clientEmail: "chris.l@example.com",
    actionLabel: "Ask a question",
    topicLabels: ["HYROX prep"],
    messagePreview: "Hillcrest — race prep over 8 weeks.",
    messageBody:
      "New inquiry from Chris L.\n\nInterested in: Ask a question\n\nTopics:\n- HYROX prep\n\nMessage:\nHillcrest — race prep over 8 weeks.",
  },
];

export const DEMO_SPECIALIST_SUBSCRIPTION = {
  plan: "SMOAC Pro",
  status: "Active",
  renewsOn: "Jun 18, 2026",
  isPremium: true,
} as const;

/** Swap into dashboard mock to preview free-tier analytics gating */
export const DEMO_SPECIALIST_SUBSCRIPTION_FREE = {
  plan: "Free",
  status: "Active",
  renewsOn: "—",
  isPremium: false,
} as const;

export const DEMO_SPECIALIST_CORE_METRICS: SpecialistAnalyticsMetric[] = [
  {
    id: "profile-views",
    label: "Profile views",
    value: 1284,
    icon: "visibility",
    isCoreKpi: true,
    lockOnFree: false,
    trend: { direction: "up", percentChange: 18, comparisonLabel: "this month" },
  },
  {
    id: "search-appearances",
    label: "Search appearances",
    value: 3412,
    icon: "pulse",
    isCoreKpi: true,
    lockOnFree: false,
    trend: { direction: "up", percentChange: 42, comparisonLabel: "this month" },
  },
  {
    id: "saved-by-clients",
    label: "Saved by clients",
    value: 47,
    icon: "diamond",
    isCoreKpi: true,
    lockOnFree: true,
    trend: { direction: "up", percentChange: 12, comparisonLabel: "this month" },
  },
  {
    id: "contact-clicks",
    label: "Contact clicks",
    value: 89,
    icon: "lightning",
    isCoreKpi: true,
    lockOnFree: true,
    trend: { direction: "down", percentChange: 6, comparisonLabel: "this month" },
  },
  {
    id: "booking-clicks",
    label: "Booking clicks",
    value: 34,
    icon: "calendar",
    isCoreKpi: true,
    lockOnFree: true,
    trend: { direction: "up", percentChange: 24, comparisonLabel: "this month" },
  },
];

export const DEMO_SPECIALIST_GROWTH_INSIGHTS: SpecialistGrowthInsight[] = [
  {
    id: "search-lift",
    message:
      "Your profile appeared 42% more in search this week — momentum is building.",
  },
  {
    id: "audience",
    message:
      "Clients searching for Hybrid Coaches viewed your profile most.",
  },
  {
    id: "photos",
    message: "Adding 3 more photos could increase clicks by 21%.",
  },
  {
    id: "response",
    message: "Profiles with response times under 1 hour rank higher.",
  },
  {
    id: "local-rank",
    message: "Your profile is outperforming 78% of local specialists.",
  },
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
  coreMetrics: DEMO_SPECIALIST_CORE_METRICS,
  growthInsights: DEMO_SPECIALIST_GROWTH_INSIGHTS,
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
  coreMetrics: DEMO_SPECIALIST_CORE_METRICS.map((metric) => ({
    ...metric,
    value: 0,
    trend: { ...metric.trend, direction: "flat" as const, percentChange: 0 },
  })),
  growthInsights: DEMO_SPECIALIST_GROWTH_INSIGHTS,
};

import type { SpecialistProfileAnalytics } from "@/types/specialist-analytics";

export interface AnalyticsStatTile {
  id: string;
  label: string;
  value: string;
  detail?: string;
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function buildAnalyticsStatTiles(
  analytics: SpecialistProfileAnalytics
): AnalyticsStatTile[] {
  return [
    {
      id: "profile-views",
      label: "Profile views",
      value: formatCount(analytics.profileViews),
    },
    {
      id: "search-appearances",
      label: "Search appearances",
      value: formatCount(analytics.searchAppearances),
    },
    {
      id: "saved-by-clients",
      label: "Saved by clients",
      value: formatCount(analytics.savedByClients),
    },
    {
      id: "contact-clicks",
      label: "Contact clicks",
      value: formatCount(analytics.contactClicks),
    },
    {
      id: "booking-clicks",
      label: "Booking clicks",
      value: formatCount(analytics.bookingClicks),
    },
    {
      id: "profile-completion",
      label: "Profile completion",
      value: `${analytics.profileCompletionPercent}%`,
    },
    {
      id: "ranking-visibility",
      label: "Ranking / visibility",
      value: analytics.rankingPosition ? `#${analytics.rankingPosition}` : "Unranked",
      detail: `Visibility score ${analytics.visibilityScore}`,
    },
  ];
}

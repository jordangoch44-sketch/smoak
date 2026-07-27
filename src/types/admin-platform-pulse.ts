/** Live platform totals + traffic for the admin executive snapshot. */

export interface AdminWeeklyCount {
  total: number;
  weekAgoTotal: number;
  /** total - weekAgoTotal */
  delta: number;
  /** null when there was no baseline a week ago */
  percentChange: number | null;
}

export interface AdminTrafficSource {
  source: string;
  views: number;
}

export interface AdminTrafficWeek {
  views: number;
  uniqueVisitors: number;
  prevViews: number;
  prevUniqueVisitors: number;
  viewsPercentChange: number | null;
  topSources: AdminTrafficSource[];
}

export interface AdminLiveEarnings {
  paidSubscriberCount: number;
  subscriberRevenueCents: number;
  adRevenueCents: number;
  /** e.g. "July 2026" */
  periodLabel: string;
}

/** Site-wide specialist engagement (anonymous event totals — not per specialist). */
export interface AdminEngagementWeek {
  searchAppearances: number;
  contactClicks: number;
  bookingClicks: number;
  prevSearchAppearances: number;
  searchAppearancesPercentChange: number | null;
  topSurfaces: Array<{ surface: string; count: number }>;
}

export interface AdminPlatformPulse {
  dataSource: "live" | "unavailable";
  specialists: AdminWeeklyCount;
  clients: AdminWeeklyCount;
  /** Pending specialist + client applications (live SQL) */
  pendingApplications: number;
  /** null until the site_visits table exists / has data access */
  traffic: AdminTrafficWeek | null;
  /**
   * Catalog estimate from live specialist_profiles flags.
   * null when profiles could not be read.
   */
  earnings: AdminLiveEarnings | null;
  /** null until specialist_engagement_events exists / has data access */
  engagement: AdminEngagementWeek | null;
}

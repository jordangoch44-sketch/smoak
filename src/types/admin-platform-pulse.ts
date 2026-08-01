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
  /** Share of current-week views (0–100) */
  sharePercent: number;
}

export interface AdminTrafficPath {
  path: string;
  views: number;
}

export interface AdminTrafficDeviceSplit {
  mobile: number;
  desktop: number;
  unknown: number;
}

export interface AdminTrafficWeek {
  views: number;
  uniqueVisitors: number;
  prevViews: number;
  prevUniqueVisitors: number;
  viewsPercentChange: number | null;
  uniqueVisitorsPercentChange: number | null;
  newVisitors: number;
  /** Ranked sources for the current week (up to 10) */
  topSources: AdminTrafficSource[];
  /** Ranked paths for the current week (up to 8) */
  topPaths: AdminTrafficPath[];
  devices: AdminTrafficDeviceSplit;
}

export interface AdminLiveEarnings {
  paidSubscriberCount: number;
  subscriberRevenueCents: number;
  adRevenueCents: number;
  /** e.g. "July 2026" */
  periodLabel: string;
  /** Where the dollar amounts came from */
  source: "stripe" | "billing_table" | "none";
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
   * Stripe / specialist_billing settlement — not catalog flag estimates.
   * null when earnings could not be read.
   */
  earnings: AdminLiveEarnings | null;
  /** null until specialist_engagement_events exists / has data access */
  engagement: AdminEngagementWeek | null;
}

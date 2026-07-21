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

export interface AdminPlatformPulse {
  dataSource: "live" | "unavailable";
  specialists: AdminWeeklyCount;
  clients: AdminWeeklyCount;
  /** null until the site_visits table exists / has data access */
  traffic: AdminTrafficWeek | null;
}

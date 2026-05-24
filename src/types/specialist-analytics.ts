/** Specialist profile performance metrics — wire to analytics API later */
export interface SpecialistProfileAnalytics {
  periodLabel: string;
  profileViews: number;
  searchAppearances: number;
  savedByClients: number;
  contactClicks: number;
  bookingClicks: number;
  profileCompletionPercent: number;
  rankingPosition: number | null;
  visibilityScore: number;
  insightMessage: string;
}

export interface SpecialistAnalyticsContext {
  profileCompletionPercent: number;
  rankingPosition: number | null;
}

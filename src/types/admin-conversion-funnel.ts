/**
 * Marketplace Conversion Funnel Types
 * Telemetry stages from top-of-funnel discovery to closed client inquiries.
 */

export type FunnelWindow = "7d" | "30d";

export type FunnelStageId =
  | "impressions"
  | "profile_views"
  | "high_intent_actions"
  | "inquiry_started"
  | "inquiry_submitted";

export interface FunnelStageMetric {
  id: FunnelStageId;
  stageNumber: number;
  label: string;
  shortLabel: string;
  description: string;
  count: number;
  prevCount: number;
  percentChange: number | null;
  /** % of stage N-1 that progressed to stage N (null for stage 1) */
  conversionRate: number | null;
  /** % of stage N-1 that dropped off before reaching stage N (null for stage 1) */
  dropoffRate: number | null;
  /** % of stage 1 (impressions) that reached this stage */
  overallConversionRate: number;
}

export interface SpecialistConversionMetric {
  specialistId: string;
  specialistName: string;
  avatarUrl?: string | null;
  profession?: string;
  tier?: string;
  city?: string;
  impressions: number;
  profileViews: number;
  saves: number;
  inquiryStarts: number;
  inquiriesSubmitted: number;
  /** % of profile views that converted into submitted inquiries */
  viewToInquiryRate: number;
  /** % of search impressions that converted into submitted inquiries */
  overallEfficiencyRate: number;
  /** % of profile views that resulted in save or contact start */
  engagementRate: number;
}

export interface FunnelKeyInsight {
  id: string;
  title: string;
  summary: string;
  tone: "positive" | "warning" | "neutral" | "highlight";
  metricValue?: string;
}

export interface MarketplaceConversionFunnel {
  window: FunnelWindow;
  periodLabel: string;
  generatedAt: string;
  stages: FunnelStageMetric[];
  /** Aggregate conversion from Stage 1 (Impressions) -> Stage 5 (Inquiries Sent) */
  overallConversionRate: number;
  /** View-to-inquiry conversion (Stage 2 -> Stage 5) */
  viewToInquiryRate: number;
  /** Inquiry start to submission completion rate (Stage 4 -> Stage 5) */
  inquiryCompletionRate: number;
  /** High-intent engagement rate (Stage 2 -> Stage 3) */
  profileEngagementRate: number;
  /** Top performing specialists by conversion efficiency */
  topSpecialists: SpecialistConversionMetric[];
  /** Actionable growth and drop-off insights */
  insights: FunnelKeyInsight[];
}

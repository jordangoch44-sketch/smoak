/**
 * Executive revenue snapshot — top-of-dashboard metrics.
 * Wire to Stripe subscriptions + ad billing APIs via admin-revenue-service.
 */

export interface AdminExecutiveRevenueSnapshot {
  /** e.g. "May 2026" */
  periodLabel: string;
  netSalesCents: number;
  subscriberRevenueCents: number;
  paidSubscriberCount: number;
  adRevenueCents: number;
  /** Month-over-month % change; null when prior month is zero */
  monthOverMonthPercent: number | null;
  monthOverMonthLabel: string;
  dataSource: "mock" | "live";
}

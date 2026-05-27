/**
 * Owner P&L snapshot — maps to Supabase finance tables + Stripe payouts later.
 * Amounts in USD cents.
 */

export interface AdminOwnerPnlSnapshot {
  totalRevenueCents: number;
  marketingSpendCents: number;
  payrollCents: number;
  softwareToolsCents: number;
  contractorAdminCents: number;
  netProfitEstimateCents: number;
  monthlyExpensesCents: number;
  profitMarginLabel: string;
}

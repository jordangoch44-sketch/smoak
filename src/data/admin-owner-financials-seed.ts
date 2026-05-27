import type { AdminOwnerPnlSnapshot } from "@/types/admin-owner-financials";

/** Owner P&L mock — replace with finance DB + Stripe reporting */
export const ADMIN_OWNER_PNL_SEED: AdminOwnerPnlSnapshot = {
  totalRevenueCents: 184_700,
  marketingSpendCents: 28_500,
  payrollCents: 42_000,
  softwareToolsCents: 6_800,
  contractorAdminCents: 4_200,
  netProfitEstimateCents: 103_200,
  monthlyExpensesCents: 81_500,
  profitMarginLabel: "56% est. margin — connect live P&L when finance tables ship",
};

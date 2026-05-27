import { ADMIN_OWNER_PNL_SEED } from "@/data/admin-owner-financials-seed";
import type { AdminOwnerPnlSnapshot } from "@/types/admin-owner-financials";

const PNL_SNAPSHOT: AdminOwnerPnlSnapshot = ADMIN_OWNER_PNL_SEED;

/** Owner P&L mock — future: Supabase finance + Stripe balance transactions */
export function getAdminOwnerPnlSnapshot(): AdminOwnerPnlSnapshot {
  return PNL_SNAPSHOT;
}

export function formatFinancialCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

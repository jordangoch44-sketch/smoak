import type { SpecialistSubscription } from "@/types/specialist-dashboard";

export const SMOAC_PRO_PRICE_LABEL = "$9.99/mo";

/** Header badge for free specialists — Free details live on Live profile, not Plan tab. */
export const SMOAC_FREE_PLAN_LABEL = "Current plan · Free";

export const SMOAC_PRO_UNLOCK = {
  title: "Try SMOAC Pro free for 1 month",
  description:
    "Unlock full analytics, ranking intelligence, and growth insights — no charge for your first month.",
  cta: "Start 1 month free",
  afterTrial: `Then ${SMOAC_PRO_PRICE_LABEL}. Cancel anytime.`,
} as const;

export const SMOAC_PRO_UPGRADE_MODAL = {
  eyebrow: "SMOAC Pro",
  title: "Start your free month",
  description:
    "Get full access to profile analytics, visibility and ranking insights, client engagement metrics, and marketplace performance data — free for 30 days.",
  price: "1 month free",
  note: `After your trial, Pro is ${SMOAC_PRO_PRICE_LABEL}. Billing and checkout are coming soon — your dashboard preview reflects the Pro experience.`,
} as const;

export function isSpecialistPremium(
  subscription: SpecialistSubscription | undefined
): boolean {
  return subscription?.isPremium === true;
}

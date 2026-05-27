import type { SpecialistSubscription } from "@/types/specialist-dashboard";

export const SMOAC_PRO_PRICE_LABEL = "$9.99/mo";

export const SMOAC_PRO_UNLOCK = {
  title: "Unlock Premium Insights",
  description:
    "Full analytics, growth trends, ranking intelligence, and marketplace performance data.",
  cta: `Upgrade — ${SMOAC_PRO_PRICE_LABEL}`,
} as const;

export const SMOAC_PRO_UPGRADE_MODAL = {
  eyebrow: "SMOAC Pro",
  title: "Upgrade your specialist account",
  description:
    "Get full access to profile analytics, visibility and ranking insights, client engagement metrics, and marketplace performance data.",
  price: SMOAC_PRO_PRICE_LABEL,
  note: "Billing and checkout are coming soon. Your dashboard preview reflects the Pro experience.",
} as const;

export function isSpecialistPremium(
  subscription: SpecialistSubscription | undefined
): boolean {
  return subscription?.isPremium === true;
}

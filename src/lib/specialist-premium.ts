/**
 * SMOAC Pro — pricing + upgrade copy.
 * Signup includes a complimentary 30-day Pro trial; after that, $9.99/mo via Stripe.
 */
import type { SpecialistSubscription } from "@/types/specialist-dashboard";

export const SMOAC_PRO_PRICE_LABEL = "$9.99/mo";

/** Header badge for free specialists — Free details live on Live profile, not Plan tab. */
export const SMOAC_FREE_PLAN_LABEL = "Current plan · Free";

export const SMOAC_PRO_UNLOCK = {
  title: "Continue with SMOAC Pro",
  description:
    "Your free Pro month has ended. Keep full analytics, ranking intelligence, and growth insights.",
  cta: `Continue for ${SMOAC_PRO_PRICE_LABEL}`,
  afterTrial: "Cancel anytime from billing settings.",
} as const;

export const SMOAC_PRO_UPGRADE_MODAL = {
  eyebrow: "SMOAC Pro",
  title: "Continue with Pro",
  description:
    "Keep full access to profile analytics, visibility and ranking insights, client engagement metrics, and marketplace performance data.",
  price: SMOAC_PRO_PRICE_LABEL,
  note: "Billed monthly. Cancel anytime.",
} as const;

/** Shown once when the complimentary trial expires */
export const SMOAC_PRO_TRIAL_ENDED_MODAL = {
  eyebrow: "Trial ended",
  title: "Your free Pro month is over",
  description:
    "You've been moved to the Free plan. Continue Pro to keep full analytics and growth insights.",
  price: SMOAC_PRO_PRICE_LABEL,
  note: "Or stay on Free — you can upgrade anytime.",
  primaryCta: `Continue Pro · ${SMOAC_PRO_PRICE_LABEL}`,
  secondaryCta: "Stay on Free",
} as const;

export function isSpecialistPremium(
  subscription: SpecialistSubscription | undefined
): boolean {
  return subscription?.isPremium === true;
}

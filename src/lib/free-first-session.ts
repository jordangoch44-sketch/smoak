import type { Trainer } from "@/types/trainer";

/** Homepage rail heading. */
export const FREE_FIRST_SESSION_RAIL_TITLE = "Try a Trainer for Free";

/** Card ribbon + inquiry topic pill. */
export const FREE_FIRST_SESSION_LABEL = "Free first session";

/** Public profile sheet CTA — opens inquire. */
export const FREE_FIRST_SESSION_CLAIM_LABEL = "Claim your free session";

export function isFreeFirstSessionBadge(
  label: string | null | undefined
): boolean {
  const trimmed = label?.trim();
  return (
    trimmed === FREE_FIRST_SESSION_LABEL || trimmed === "Free 1st session"
  );
}

/** Homepage rail size — matches New Specialists. */
export const FREE_FIRST_SESSION_RAIL_LIMIT = 8;

/**
 * Existing listings default ON so current specialists appear until they
 * turn the offer off in profile.
 */
export function trainerOffersFreeFirstSession(
  trainer: Pick<Trainer, "offersFreeFirstSession">
): boolean {
  return trainer.offersFreeFirstSession !== false;
}

/** Pro, PRO+, or complimentary Pro trial (`isPremium`). */
export function isTrainerProOrProPlus(
  trainer: Pick<Trainer, "isPremium" | "membershipPlan">
): boolean {
  if (trainer.isPremium === true) return true;
  return (
    trainer.membershipPlan === "premium" || trainer.membershipPlan === "platinum"
  );
}

/**
 * Marketplace Free 1st session rail + public profile chip.
 * Defaults ON when the flag was never set. Changing the offer in profile
 * is a Pro / PRO+ control.
 */
export function isTrainerFreeFirstSessionEligible(
  trainer: Pick<Trainer, "offersFreeFirstSession">
): boolean {
  return trainerOffersFreeFirstSession(trainer);
}

import type { Trainer } from "@/types/trainer";

export const FREE_FIRST_SESSION_LABEL = "Free 1st session";

export function isFreeFirstSessionBadge(
  label: string | null | undefined
): boolean {
  return label?.trim() === FREE_FIRST_SESSION_LABEL;
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

/** Pro, Pro Plus, or complimentary Pro trial (`isPremium`). */
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
 * is a Pro / Pro Plus control.
 */
export function isTrainerFreeFirstSessionEligible(
  trainer: Pick<Trainer, "offersFreeFirstSession">
): boolean {
  return trainerOffersFreeFirstSession(trainer);
}

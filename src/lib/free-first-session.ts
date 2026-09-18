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
 * Missing / unset means On for listings that never stored the flag.
 * New applications persist Off. Only an explicit `false` turns the offer off.
 */
export function normalizeOffersFreeFirstSession(
  value: boolean | null | undefined
): boolean {
  return value !== false;
}

/**
 * Existing listings that never stored the flag stay On until they turn it
 * off in profile. New specialists start Off and opt in from edit profile.
 */
export function trainerOffersFreeFirstSession(
  trainer: Pick<Trainer, "offersFreeFirstSession">
): boolean {
  return normalizeOffersFreeFirstSession(trainer.offersFreeFirstSession);
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
 * The stored opt-in flag stays on the listing after a trial ends; clients
 * only see it while the specialist is on Pro / PRO+ / an active trial.
 */
export function isTrainerFreeFirstSessionEligible(
  trainer: Pick<Trainer, "offersFreeFirstSession" | "isPremium" | "membershipPlan">
): boolean {
  return (
    isTrainerProOrProPlus(trainer) && trainerOffersFreeFirstSession(trainer)
  );
}

/**
 * Growth mode. SMOAK does not sell memberships or boosts.
 * Every specialist listing uses the full PRO+ profile.
 * Paid products, when this flips on, are for visibility only.
 * Stored membership_plan values stay as they are.
 */
export const MONETIZATION_ENABLED = false;

export function isMonetizationEnabled(): boolean {
  return MONETIZATION_ENABLED;
}

/**
 * Every specialist gets the full profile.
 * Turning monetization on sells visibility. It does not lock photos, video, or inquiries.
 */
export function growthProfileAccess(_input?: {
  isPremium?: boolean;
  isProPlus?: boolean;
}): { isPremium: boolean; isProPlus: boolean } {
  return { isPremium: true, isProPlus: true };
}

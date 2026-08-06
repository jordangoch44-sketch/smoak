/**
 * SMOAC house promo inventory — fixed slots, swappable campaigns.
 * Paid specialist placements never use these slots.
 */

export type SitePromoSlotId =
  | "specialist_dashboard_hero"
  | "specialist_dashboard_pro_upgrade"
  | "specialist_dashboard_boost"
  | "explore_results_rail"
  | "home_mid_promo"
  | "home_client_promo"
  | "rankings_footer_promo";

export type SitePromoAudience = "specialist" | "client" | "guest" | "all";

export type SitePromoCtaKind =
  | "link"
  | "open_boost"
  | "open_pro"
  | "claim_pro_trial";

export interface SitePromoCampaign {
  id: string;
  /** Higher wins when multiple campaigns target the same slot */
  priority: number;
  slotIds: readonly SitePromoSlotId[];
  audience: SitePromoAudience;
  eyebrow: string;
  headline: string;
  body: string;
  /** Optional proof line — keep honest / analytics-backed when possible */
  stat?: string;
  ctaLabel: string;
  ctaKind: SitePromoCtaKind;
  /** Required when ctaKind is link */
  ctaHref?: string;
  dismissible?: boolean;
  /**
   * When true, dismiss lasts only for the current sign-in token
   * (`userId` + `signedInAt`) so the promo returns on the next login.
   */
  reappearOnSignIn?: boolean;
  /** Hide when the specialist already has an active placement add-on */
  hideWhenBoosting?: boolean;
  /** Circulating edge glow on the CTA (Plan-tab style) */
  orbitCta?: boolean;
  /** Visual accent — boost = neon yellow; Pro trial = neon blue */
  accent?: "default" | "neon-blue" | "neon-yellow";
  /** ISO dates — omit for always-on */
  startsAt?: string;
  endsAt?: string;
  active: boolean;
}

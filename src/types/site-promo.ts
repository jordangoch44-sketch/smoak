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

export type SitePromoCtaKind = "link" | "open_boost" | "open_pro";

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
  /** ISO dates — omit for always-on */
  startsAt?: string;
  endsAt?: string;
  active: boolean;
}

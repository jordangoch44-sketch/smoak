/** Public + dashboard specialist rate cards (not SMOAC platform pricing). */

export const SPECIALIST_PRICING_OFFERING_TYPES = [
  "one-on-one",
  "monthly-membership",
  "package",
  "drop-in",
  "online-coaching",
  "free-consult",
] as const;

export type SpecialistPricingOfferingType =
  (typeof SPECIALIST_PRICING_OFFERING_TYPES)[number];

export interface SpecialistPricingOffering {
  id: string;
  type: SpecialistPricingOfferingType;
  /** USD. Free consult is always 0. */
  price: number;
  included: string;
  /** Optional — e.g. “8 weeks”, “month-to-month”, “10 sessions”. */
  commitment: string;
}

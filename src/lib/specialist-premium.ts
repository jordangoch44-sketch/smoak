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

/** Confirm before starting the one-time complimentary Pro trial */
export const SMOAC_PRO_TRIAL_CONFIRM_MODAL = {
  eyebrow: "One-time offer",
  title: "Start your free Pro month",
  description:
    "No card required. Full Pro access for 30 days — then you return to Free unless you upgrade.",
  benefits: [
    "Full profile analytics unlocked",
    "Visibility & ranking intelligence",
    "Client engagement metrics",
    "Growth insights across your marketplace profile",
  ] as const,
  note: "Available once per specialist account.",
  primaryCta: "Confirm & start trial",
  secondaryCta: "Not now",
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

/** Header badge while complimentary Pro trial is active */
export function formatProTrialBadgeLabel(
  daysRemaining: number | null | undefined
): string {
  if (typeof daysRemaining !== "number") return "Pro Trial";
  if (daysRemaining <= 0) return "Pro Trial · ending today";
  return `Pro Trial · ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`;
}

/** Neon free-trial bubble — once per specialist, gone after trial starts. */
export function showSpecialistFreeTrialPromo(session: {
  role?: string | null;
  premiumIsPaid?: boolean;
  premiumTrialUsed?: boolean;
  premiumTrialActive?: boolean;
  premiumTrialEndsAt?: string;
  isPremium?: boolean;
} | null | undefined): boolean {
  if (!session || session.role !== "specialist") return false;
  if (isSpecialistPayingPro(session)) return false;
  if (session.premiumTrialUsed) return false;
  if (session.premiumTrialActive) return false;
  if (session.premiumTrialEndsAt) return false;
  return true;
}

/** Purple Upgrade to Pro bubble — stays until they start paying. */
export function showSpecialistPaidUpgradePromo(session: {
  role?: string | null;
  premiumIsPaid?: boolean;
  premiumTrialActive?: boolean;
  isPremium?: boolean;
} | null | undefined): boolean {
  if (!session || session.role !== "specialist") return false;
  return !isSpecialistPayingPro(session);
}

/** Final-day LAST CHANCE banner while complimentary trial is still active. */
export function showProTrialLastChance(session: {
  premiumTrialActive?: boolean;
  premiumTrialDaysRemaining?: number;
} | null | undefined): boolean {
  if (!session?.premiumTrialActive) return false;
  const days = session.premiumTrialDaysRemaining;
  return typeof days === "number" && days <= 1;
}

function isSpecialistPayingPro(session: {
  premiumIsPaid?: boolean;
  premiumTrialActive?: boolean;
  isPremium?: boolean;
}): boolean {
  if (session.premiumIsPaid) return true;
  /* Legacy sessions without premiumIsPaid: Pro without an active free trial. */
  return Boolean(session.isPremium && !session.premiumTrialActive);
}

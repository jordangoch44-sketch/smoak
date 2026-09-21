/**
 * SMOAC Pro — pricing + upgrade copy.
 * Going live includes a complimentary 30-day Pro trial; after that, $19.99/mo via Stripe.
 */
import type { SpecialistSubscription } from "@/types/specialist-dashboard";

export const SMOAC_PRO_PRICE_LABEL = "$19.99/mo";
export const SMOAC_PRO_PLUS_PRICE_LABEL = "$29.99/mo";

/** Header badge for free specialists — Free details live on Live profile, not Plan tab. */
export const SMOAC_FREE_PLAN_LABEL = "Current plan · Free";

export const SMOAC_PRO_UNLOCK = {
  title: "Upgrade to SMOAC Pro",
  description:
    "Unlock full analytics, ranking intelligence, and growth insights.",
  cta: `Upgrade for ${SMOAC_PRO_PRICE_LABEL}`,
  afterTrial: "Cancel anytime from billing settings.",
} as const;

export const SMOAC_PRO_UPGRADE_MODAL = {
  eyebrow: "SMOAC Pro",
  title: "Upgrade to Pro",
  description:
    "Unlock full profile analytics, ranking intelligence, client engagement metrics, and marketplace growth insights.",
  price: SMOAC_PRO_PRICE_LABEL,
  note: "Billed monthly. Cancel anytime.",
} as const;

export type MembershipBenefit = {
  title: string;
  detail: string;
};

export const SMOAC_PRO_BENEFITS: readonly MembershipBenefit[] = [
  {
    title: "Full profile analytics",
    detail: "Track views, clicks, and performance",
  },
  {
    title: "Visibility and ranking intelligence",
    detail: "See how you rank and opportunities to grow",
  },
  {
    title: "Client engagement metrics",
    detail: "Understand inquiries and activity",
  },
  {
    title: "Free 1st session marketplace placement",
    detail: "Get featured in client search",
  },
  {
    title: "Growth insights on your live profile",
    detail: "Personalized tips to level up",
  },
  {
    title: "Intro video above your bio",
    detail: "A “Hi, I’m …” clip clients can play on your profile",
  },
];

export const SMOAC_PRO_PLUS_BENEFITS: readonly MembershipBenefit[] = [
  {
    title: "Everything in Pro",
    detail: "Analytics, ranking intelligence, and growth tools",
  },
  {
    title: "Up to 5 phone videos, 45 seconds each",
    detail: "Upload clips straight from your phone",
  },
  {
    title: "Client results under Specialties",
    detail: "Show transformations on your profile",
  },
  {
    title: "20% off Boost campaigns",
    detail: "Promote your listing for less",
  },
];

export const SMOAC_FREE_BENEFITS: readonly MembershipBenefit[] = [
  {
    title: "Marketplace listing",
    detail: "Show up in Explore for clients nearby",
  },
  {
    title: "Client inquiries",
    detail: "Receive messages from people who find you",
  },
  {
    title: "Public profile",
    detail: "Photos, bio, specialties, and pricing",
  },
];

export type MembershipPlanPickerTier = {
  id: "free" | "premium" | "platinum";
  product: "premium" | "platinum" | null;
  shortLabel: string;
  label: string;
  priceLabel: string;
  description: string;
  benefits: readonly MembershipBenefit[];
};

export const MEMBERSHIP_PLAN_PICKER_TIERS: readonly MembershipPlanPickerTier[] =
  [
    {
      id: "free",
      product: null,
      shortLabel: "Free",
      label: "Free",
      priceLabel: "Free",
      description: "List on the marketplace and receive client inquiries.",
      benefits: SMOAC_FREE_BENEFITS,
    },
    {
      id: "premium",
      product: "premium",
      shortLabel: "Pro",
      label: "SMOAC Pro",
      priceLabel: SMOAC_PRO_PRICE_LABEL,
      description:
        "Unlock full analytics, ranking intelligence, and growth insights.",
      benefits: SMOAC_PRO_BENEFITS,
    },
    {
      id: "platinum",
      product: "platinum",
      shortLabel: "PRO+",
      label: "SMOAC PRO+",
      priceLabel: SMOAC_PRO_PLUS_PRICE_LABEL,
      description:
        "PRO+ includes Pro, plus phone videos, client results, and 20% off Boosts.",
      benefits: SMOAC_PRO_PLUS_BENEFITS,
    },
  ];

export const SMOAC_UPGRADE_FOOTER = "Invest in your growth";

/** Confirm before starting the one-time complimentary Pro trial */
export const SMOAC_PRO_TRIAL_CONFIRM_MODAL = {
  eyebrow: "One-time offer",
  title: "Start your free Pro month",
  description:
    "No card required. Full Pro access for 30 days — then you return to Free unless you upgrade.",
  benefits: SMOAC_PRO_BENEFITS,
  note: "Available once per specialist account.",
  primaryCta: "Confirm & start trial",
  secondaryCta: "Not now",
} as const;

/** Shown once when the complimentary trial expires */
export const SMOAC_PRO_TRIAL_ENDED_MODAL = {
  eyebrow: "Trial ended",
  title: "Your free Pro month is over",
  description:
    "You're on Free now. Extra photos, pins, intro video, and Free first session stay saved — clients just can't see them until you restore Pro.",
  price: SMOAC_PRO_PRICE_LABEL,
  note: "Upgrade to put those Pro extras back on Marketplace.",
  primaryCta: `Restore Pro · ${SMOAC_PRO_PRICE_LABEL}`,
  secondaryCta: "Stay on Free",
} as const;

export function isSpecialistPremium(
  subscription: SpecialistSubscription | undefined
): boolean {
  return subscription?.isPremium === true;
}

export type SpecialistMembershipPlan = "free" | "premium" | "platinum";

export function parseMembershipPlan(
  value: unknown
): SpecialistMembershipPlan {
  if (value === "premium" || value === "platinum") return value;
  return "free";
}

export function membershipPlanRank(plan: SpecialistMembershipPlan): number {
  if (plan === "platinum") return 2;
  if (plan === "premium") return 1;
  return 0;
}

export function isProPlusPlan(
  plan: string | null | undefined
): boolean {
  return plan === "platinum";
}

export function isTrainerProPlus(trainer: {
  membershipPlan?: string | null;
}): boolean {
  return trainer.membershipPlan === "platinum";
}

/** Compact plan name on badges. Display is PRO+ — never PROPLUS / Pro Plus. */
export const MEMBERSHIP_BADGE_LABEL = {
  free: "Free",
  trial: "Pro Trial",
  premium: "Pro",
  platinum: "PRO+",
} as const;

export type MembershipBadgeTone = "free" | "pro" | "pro-plus" | "pro-trial";

export function membershipBadgeToneForSession(session: {
  premiumTrialActive?: boolean;
  isPremium?: boolean;
  membershipPlan?: string | null;
} | null | undefined): MembershipBadgeTone {
  if (session?.premiumTrialActive) return "pro-trial";
  if (isProPlusPlan(session?.membershipPlan)) return "pro-plus";
  if (session?.isPremium) return "pro";
  return "free";
}

export function membershipRoleBadgeClassName(tone: MembershipBadgeTone): string {
  if (tone === "pro-plus") return "dashboard-role-badge dashboard-role-badge--pro-plus";
  if (tone === "pro") return "dashboard-role-badge dashboard-role-badge--pro";
  if (tone === "pro-trial") return "dashboard-role-badge dashboard-role-badge--pro-trial";
  return "dashboard-role-badge dashboard-role-badge--free";
}

/** Compact header chip — Pro Trial / Pro / PRO+. Days stay on dashboard badges. */
export function formatMembershipHeaderBadgeLabel(session: {
  premiumTrialActive?: boolean;
  isPremium?: boolean;
  membershipPlan?: string | null;
} | null | undefined): string {
  if (session?.premiumTrialActive) return MEMBERSHIP_BADGE_LABEL.trial;
  if (isProPlusPlan(session?.membershipPlan)) return MEMBERSHIP_BADGE_LABEL.platinum;
  if (session?.isPremium) return MEMBERSHIP_BADGE_LABEL.premium;
  return MEMBERSHIP_BADGE_LABEL.free;
}

/** Header badge while complimentary Pro trial is active */
export function formatProTrialBadgeLabel(
  daysRemaining: number | null | undefined
): string {
  if (typeof daysRemaining !== "number") return "Pro Trial";
  if (daysRemaining <= 0) return "Pro Trial · ending today";
  return `Pro Trial · ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`;
}

/** Short membership chip — Pro Trial · days left / Pro / PRO+ / Free. */
export function formatMembershipShortLabel(session: {
  premiumTrialActive?: boolean;
  premiumTrialDaysRemaining?: number | null;
  isPremium?: boolean;
  membershipPlan?: string | null;
} | null | undefined): string {
  if (session?.premiumTrialActive) {
    return formatProTrialBadgeLabel(session.premiumTrialDaysRemaining);
  }
  if (isProPlusPlan(session?.membershipPlan)) return MEMBERSHIP_BADGE_LABEL.platinum;
  if (session?.isPremium) return MEMBERSHIP_BADGE_LABEL.premium;
  return MEMBERSHIP_BADGE_LABEL.free;
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

export function isSpecialistPayingPro(session: {
  premiumIsPaid?: boolean;
  premiumTrialActive?: boolean;
  isPremium?: boolean;
}): boolean {
  if (session.premiumIsPaid) return true;
  /* Legacy sessions without premiumIsPaid: Pro without an active free trial. */
  return Boolean(session.isPremium && !session.premiumTrialActive);
}

export type MembershipGrowthSession = {
  premiumIsPaid?: boolean;
  premiumTrialActive?: boolean;
  premiumTrialDaysRemaining?: number | null;
  premiumTrialJustEnded?: boolean;
  isPremium?: boolean;
  membershipPlan?: string | null;
};

/** Next growth step from the current specialist plan. */
export type MembershipGrowthIntent = "pro" | "pro-plus" | "boost";

export type MembershipUpgradeTone = "pro" | "trial" | "pro-plus";

export type MembershipUpgradeOffer = {
  intent: Exclude<MembershipGrowthIntent, "boost">;
  product: "premium" | "platinum";
  tone: MembershipUpgradeTone;
  eyebrow: string;
  title: string;
  description: string;
  price: string;
  note: string;
  cta: string;
  secondaryCta?: string;
  badgeLabel: string;
  badgeCaption: string;
  benefits: readonly MembershipBenefit[];
};

export type MembershipGrowthOffer =
  | MembershipUpgradeOffer
  | { intent: "boost" };

export function resolveMembershipGrowthIntent(
  session: MembershipGrowthSession | null | undefined
): MembershipGrowthIntent {
  if (isProPlusPlan(session?.membershipPlan)) return "boost";
  if (session && isSpecialistPayingPro(session)) return "pro-plus";
  return "pro";
}

function trialKeepTitle(daysRemaining: number | null | undefined): string {
  if (typeof daysRemaining !== "number") {
    return "Keep Pro before your trial ends";
  }
  if (daysRemaining <= 0) return "Your trial ends today — keep Pro";
  if (daysRemaining === 1) return "1 day left — keep Pro";
  return `${daysRemaining} days left — keep Pro`;
}

export function currentMembershipPlanFromSession(
  session: MembershipGrowthSession | null | undefined
): SpecialistMembershipPlan {
  if (isProPlusPlan(session?.membershipPlan)) return "platinum";
  if (session?.isPremium || session?.premiumTrialActive) return "premium";
  return "free";
}

/** Whether checkout can move this account onto the selected membership. */
export function canSubscribeToMembershipPlan(
  session: MembershipGrowthSession | null | undefined,
  target: SpecialistMembershipPlan
): boolean {
  if (target === "free") return false;
  if (isProPlusPlan(session?.membershipPlan)) return false;
  if (target === "platinum") return true;
  return !isSpecialistPayingPro(session ?? {});
}

/**
 * Copy + Stripe product for a specific membership checkout.
 * Used by Edit Profile → Plan so Free can pick Pro or PRO+.
 */
export function membershipUpgradeOfferForProduct(
  product: "premium" | "platinum",
  session: MembershipGrowthSession | null | undefined,
  options?: { trialEnded?: boolean }
): MembershipUpgradeOffer {
  if (product === "platinum") {
    return {
      intent: "pro-plus",
      product: "platinum",
      tone: "pro-plus",
      eyebrow: "SMOAC PRO+",
      title: "Upgrade to PRO+",
      description:
        "PRO+ includes everything in Pro, plus up to 5 phone videos, client results under Specialties, and 20% off Boosts.",
      price: SMOAC_PRO_PLUS_PRICE_LABEL,
      note: "Billed monthly. Cancel anytime.",
      cta: `Upgrade to PRO+ · ${SMOAC_PRO_PLUS_PRICE_LABEL}`,
      badgeLabel: "PRO+",
      badgeCaption: "Go further",
      benefits: SMOAC_PRO_PLUS_BENEFITS,
    };
  }

  if (options?.trialEnded) {
    return {
      intent: "pro",
      product: "premium",
      tone: "trial",
      eyebrow: SMOAC_PRO_TRIAL_ENDED_MODAL.eyebrow,
      title: SMOAC_PRO_TRIAL_ENDED_MODAL.title,
      description: SMOAC_PRO_TRIAL_ENDED_MODAL.description,
      price: SMOAC_PRO_TRIAL_ENDED_MODAL.price,
      note: SMOAC_PRO_TRIAL_ENDED_MODAL.note,
      cta: SMOAC_PRO_TRIAL_ENDED_MODAL.primaryCta,
      secondaryCta: SMOAC_PRO_TRIAL_ENDED_MODAL.secondaryCta,
      badgeLabel: "PRO",
      badgeCaption: "Restore what clients saw",
      benefits: SMOAC_PRO_BENEFITS,
    };
  }

  if (session?.premiumTrialActive) {
    return {
      intent: "pro",
      product: "premium",
      tone: "trial",
      eyebrow: "Pro trial ending",
      title: trialKeepTitle(session.premiumTrialDaysRemaining),
      description:
        "Subscribe now to keep Pro analytics, ranking intelligence, and growth insights when your trial ends.",
      price: SMOAC_PRO_PRICE_LABEL,
      note: "Billed monthly. Cancel anytime.",
      cta: `Keep Pro · ${SMOAC_PRO_PRICE_LABEL}`,
      badgeLabel: "PRO",
      badgeCaption: "Keep your momentum",
      benefits: SMOAC_PRO_BENEFITS,
    };
  }

  return {
    intent: "pro",
    product: "premium",
    tone: "pro",
    eyebrow: SMOAC_PRO_UPGRADE_MODAL.eyebrow,
    title: SMOAC_PRO_UPGRADE_MODAL.title,
    description: SMOAC_PRO_UPGRADE_MODAL.description,
    price: SMOAC_PRO_UPGRADE_MODAL.price,
    note: SMOAC_PRO_UPGRADE_MODAL.note,
    cta: `Upgrade to Pro · ${SMOAC_PRO_PRICE_LABEL}`,
    badgeLabel: "PRO",
    badgeCaption: "Unlock your growth",
    benefits: SMOAC_PRO_BENEFITS,
  };
}

/**
 * Copy + Stripe product for upgrade popups.
 * Free / Pro trial → Pro. Paid Pro → PRO+. PRO+ → Boost (handled by caller).
 */
export function resolveMembershipUpgradeOffer(
  session: MembershipGrowthSession | null | undefined,
  options?: { trialEnded?: boolean }
): MembershipGrowthOffer {
  if (options?.trialEnded) {
    return membershipUpgradeOfferForProduct("premium", session, options);
  }

  const intent = resolveMembershipGrowthIntent(session);
  if (intent === "boost") return { intent: "boost" };
  if (intent === "pro-plus") {
    return membershipUpgradeOfferForProduct("platinum", session);
  }
  return membershipUpgradeOfferForProduct("premium", session);
}

export function isMembershipUpgradeOffer(
  offer: MembershipGrowthOffer
): offer is MembershipUpgradeOffer {
  return offer.intent !== "boost";
}

/**
 * Site header plan chip next to SMOAC — specialists on paid Pro, PRO+,
 * or an active trial. Hidden for clients and logged-out visitors.
 */
export function showSpecialistHeaderProBadge(session: {
  role?: string | null;
  isPremium?: boolean;
  premiumTrialActive?: boolean;
  membershipPlan?: string | null;
} | null | undefined): boolean {
  if (!session || session.role !== "specialist") return false;
  if (isProPlusPlan(session.membershipPlan)) return true;
  return Boolean(session.isPremium || session.premiumTrialActive);
}

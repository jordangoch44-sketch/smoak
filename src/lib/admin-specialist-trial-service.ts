/** Complimentary 30-day Pro trial vs paid Pro — admin roster + conversion. */

export interface AdminSpecialistEntitlement {
  userId: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  billingStatus: string | null;
}

export interface AdminSpecialistTrialFields {
  premiumTrialStartedAt: string | null;
  premiumTrialEndsAt: string | null;
  premiumTrialActive: boolean;
  premiumTrialDaysRemaining: number | null;
  isPaidPro: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function isPaidBillingStatus(
  status: string | null | undefined
): boolean {
  return status === "active" || status === "trialing";
}

export function trialDaysRemaining(
  endsAt: string | null | undefined,
  now = Date.now()
): number | null {
  if (!endsAt) return null;
  const ends = Date.parse(endsAt);
  if (!Number.isFinite(ends)) return null;
  return Math.max(0, Math.ceil((ends - now) / DAY_MS));
}

export function isComplimentaryTrialActive(
  entitlement: Pick<AdminSpecialistEntitlement, "trialEndsAt">,
  isPaid: boolean,
  now = Date.now()
): boolean {
  if (isPaid) return false;
  if (!entitlement.trialEndsAt) return false;
  const ends = Date.parse(entitlement.trialEndsAt);
  return Number.isFinite(ends) && ends > now;
}

export function entitlementToTrialFields(
  entitlement: AdminSpecialistEntitlement | undefined,
  now = Date.now()
): AdminSpecialistTrialFields {
  if (!entitlement) {
    return {
      premiumTrialStartedAt: null,
      premiumTrialEndsAt: null,
      premiumTrialActive: false,
      premiumTrialDaysRemaining: null,
      isPaidPro: false,
    };
  }

  const isPaidPro = isPaidBillingStatus(entitlement.billingStatus);
  const premiumTrialActive = isComplimentaryTrialActive(
    entitlement,
    isPaidPro,
    now
  );

  return {
    premiumTrialStartedAt: entitlement.trialStartedAt,
    premiumTrialEndsAt: entitlement.trialEndsAt,
    premiumTrialActive,
    premiumTrialDaysRemaining: premiumTrialActive
      ? trialDaysRemaining(entitlement.trialEndsAt, now)
      : null,
    isPaidPro,
  };
}

export interface ProTrialConversion {
  /** Currently on complimentary Pro trial (not paid) */
  activeCount: number;
  /** Ever started the complimentary trial */
  startedCount: number;
  /** Started trial and now have a paid Stripe Pro subscription */
  convertedCount: number;
  /** converted / started, null when nobody has started a trial yet */
  conversionPercent: number | null;
}

export function computeProTrialConversion(
  specialists: readonly {
    premiumTrialStartedAt?: string | null;
    isPaidPro?: boolean;
    premiumTrialActive?: boolean;
  }[]
): ProTrialConversion {
  let startedCount = 0;
  let convertedCount = 0;
  let activeCount = 0;

  for (const row of specialists) {
    if (row.premiumTrialActive && !row.isPaidPro) activeCount += 1;
    if (!row.premiumTrialStartedAt) continue;
    startedCount += 1;
    if (row.isPaidPro) convertedCount += 1;
  }

  return {
    activeCount,
    startedCount,
    convertedCount,
    conversionPercent:
      startedCount > 0
        ? Math.round((convertedCount / startedCount) * 1000) / 10
        : null,
  };
}

export function formatProTrialDaysLabel(
  daysRemaining: number | null | undefined
): string {
  if (daysRemaining == null) return "Pro trial";
  if (daysRemaining <= 0) return "Trial ending today";
  if (daysRemaining === 1) return "1 day left on trial";
  return `${daysRemaining} days left on trial`;
}

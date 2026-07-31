import { SITE_PROMO_CAMPAIGNS } from "@/data/site-promos";
import type {
  SitePromoAudience,
  SitePromoCampaign,
  SitePromoSlotId,
} from "@/types/site-promo";

const DISMISS_PREFIX = "smoac_promo_dismissed:";

export function isPromoDismissed(campaignId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(`${DISMISS_PREFIX}${campaignId}`) === "1";
  } catch {
    return false;
  }
}

export function dismissPromo(campaignId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${DISMISS_PREFIX}${campaignId}`, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

function audienceMatches(
  campaign: SitePromoCampaign,
  audience: SitePromoAudience
): boolean {
  if (campaign.audience === "all") return true;
  return campaign.audience === audience;
}

function isWithinSchedule(
  campaign: SitePromoCampaign,
  nowMs: number
): boolean {
  if (campaign.startsAt) {
    const start = Date.parse(campaign.startsAt);
    if (Number.isFinite(start) && nowMs < start) return false;
  }
  if (campaign.endsAt) {
    const end = Date.parse(campaign.endsAt);
    if (Number.isFinite(end) && nowMs > end) return false;
  }
  return true;
}

/**
 * Pick the highest-priority active campaign for a fixed house-ad slot.
 */
export function resolveSitePromoForSlot(
  slotId: SitePromoSlotId,
  options: {
    audience: SitePromoAudience;
    nowMs?: number;
    includeDismissed?: boolean;
  }
): SitePromoCampaign | null {
  const nowMs = options.nowMs ?? Date.now();
  const candidates = SITE_PROMO_CAMPAIGNS.filter((campaign) => {
    if (!campaign.active) return false;
    if (!campaign.slotIds.includes(slotId)) return false;
    if (!audienceMatches(campaign, options.audience)) return false;
    if (!isWithinSchedule(campaign, nowMs)) return false;
    if (!options.includeDismissed && isPromoDismissed(campaign.id)) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => b.priority - a.priority)[0] ?? null;
}

export function resolvePromoAudience(input: {
  role?: string | null;
  isLoggedIn: boolean;
}): SitePromoAudience {
  if (!input.isLoggedIn) return "guest";
  if (input.role === "specialist") return "specialist";
  if (input.role === "client") return "client";
  return "guest";
}

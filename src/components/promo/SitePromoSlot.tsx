"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useHydrated } from "@/hooks/useHydrated";
import {
  dismissPromo,
  resolvePromoAudience,
  resolveSitePromoForSlot,
} from "@/lib/site-promos";
import type { SitePromoCtaKind, SitePromoSlotId } from "@/types/site-promo";
import { cn } from "@/lib/utils";

interface SitePromoSlotProps {
  slotId: SitePromoSlotId;
  className?: string;
  /** Dashboard can open Boost / Pro modals instead of navigating */
  onOpenBoost?: () => void;
  onOpenPro?: () => void;
  /** Opens free-trial benefits confirm modal */
  onOpenProTrial?: () => void;
  /** Visual density */
  variant?: "default" | "compact" | "banner";
}

const ORBIT_SLOTS = new Set<SitePromoSlotId>([
  "specialist_dashboard_hero",
  "specialist_dashboard_pro_upgrade",
]);

export function SitePromoSlot({
  slotId,
  className,
  onOpenBoost,
  onOpenPro,
  onOpenProTrial,
  variant = "default",
}: SitePromoSlotProps) {
  const hydrated = useHydrated();
  const { session, isSignedIn } = useAuthSession();
  const router = useRouter();
  const [dismissedLocal, setDismissedLocal] = useState(false);
  const [revision, setRevision] = useState(0);

  const audience = resolvePromoAudience({
    role: session?.role ?? null,
    isLoggedIn: isSignedIn,
  });

  const campaign =
    hydrated && !dismissedLocal
      ? resolveSitePromoForSlot(slotId, { audience })
      : null;

  useEffect(() => {
    /* Re-resolve after hydrate so dismiss state is accurate */
    setRevision((n) => n + 1);
  }, [hydrated, audience]);

  if (!hydrated || !campaign) return null;
  void revision;

  function handleDismiss() {
    dismissPromo(campaign!.id);
    setDismissedLocal(true);
  }

  function runCta(kind: SitePromoCtaKind, href?: string) {
    if (kind === "open_boost") {
      if (onOpenBoost) {
        onOpenBoost();
        return;
      }
      router.push("/specialist-dashboard?promo=boost");
      return;
    }
    if (kind === "open_pro") {
      if (onOpenPro) {
        onOpenPro();
        return;
      }
      router.push("/specialist-dashboard?promo=pro");
      return;
    }
    if (kind === "claim_pro_trial") {
      if (onOpenProTrial) {
        onOpenProTrial();
        return;
      }
      router.push("/specialist-dashboard?promo=pro-trial");
      return;
    }
    if (href) {
      router.push(href);
    }
  }

  const useOrbit = ORBIT_SLOTS.has(slotId);

  return (
    <aside
      className={cn(
        "site-promo",
        `site-promo--${variant}`,
        `site-promo--slot-${slotId}`,
        className
      )}
      aria-labelledby={`site-promo-title-${slotId}`}
      data-promo-id={campaign.id}
      data-promo-slot={slotId}
    >
      <div className="site-promo__glow" aria-hidden />
      {campaign.dismissible ? (
        <button
          type="button"
          className="site-promo__dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss promo"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <div className="site-promo__copy">
        <p className="site-promo__eyebrow">{campaign.eyebrow}</p>
        <h2
          id={`site-promo-title-${slotId}`}
          className="site-promo__headline"
        >
          {campaign.headline}
        </h2>
        <p className="site-promo__body">{campaign.body}</p>
        {campaign.stat ? (
          <p className="site-promo__stat">{campaign.stat}</p>
        ) : null}
      </div>

      <div className="site-promo__actions">
        {campaign.ctaKind === "link" && campaign.ctaHref ? (
          <span
            className={cn(
              "site-promo__cta-wrap",
              useOrbit && "site-promo__cta-wrap--orbit"
            )}
          >
            <Link href={campaign.ctaHref} className="site-promo__cta">
              {campaign.ctaLabel}
            </Link>
          </span>
        ) : (
          <span
            className={cn(
              "site-promo__cta-wrap",
              useOrbit && "site-promo__cta-wrap--orbit"
            )}
          >
            <button
              type="button"
              className="site-promo__cta"
              onClick={() => runCta(campaign.ctaKind, campaign.ctaHref)}
            >
              {campaign.ctaLabel}
            </button>
          </span>
        )}
      </div>
    </aside>
  );
}

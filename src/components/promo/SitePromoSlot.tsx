"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useHydrated } from "@/hooks/useHydrated";
import {
  dismissPromo,
  promoSignInToken,
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
  const [boosting, setBoosting] = useState<boolean | null>(null);
  const [revision, setRevision] = useState(0);

  const audience = resolvePromoAudience({
    role: session?.role ?? null,
    isLoggedIn: isSignedIn,
  });

  const signInToken = promoSignInToken({
    userId: session?.userId,
    signedInAt: session?.signedInAt,
  });

  const campaign =
    hydrated && !dismissedLocal
      ? resolveSitePromoForSlot(slotId, { audience, signInToken })
      : null;

  useEffect(() => {
    /* New sign-in should resurface reappearOnSignIn campaigns */
    setDismissedLocal(false);
    setRevision((n) => n + 1);
  }, [hydrated, audience, signInToken]);

  useEffect(() => {
    if (!campaign?.hideWhenBoosting || audience !== "specialist") {
      setBoosting(null);
      return;
    }

    let cancelled = false;
    setBoosting(null);

    void (async () => {
      try {
        const res = await fetch("/api/stripe/billing-summary");
        if (!res.ok) {
          if (!cancelled) setBoosting(false);
          return;
        }
        const data = (await res.json()) as { activeAddons?: string[] };
        const addons = Array.isArray(data.activeAddons) ? data.activeAddons : [];
        if (!cancelled) setBoosting(addons.length > 0);
      } catch {
        if (!cancelled) setBoosting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaign?.id, campaign?.hideWhenBoosting, audience]);

  if (!hydrated || !campaign) return null;
  if (campaign.hideWhenBoosting && boosting !== false) return null;
  void revision;

  function handleDismiss() {
    const token = campaign!.reappearOnSignIn ? signInToken : null;
    dismissPromo(campaign!.id, token);
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

  const useOrbit = Boolean(campaign.orbitCta);
  const accent = campaign.accent ?? "default";

  return (
    <aside
      className={cn(
        "site-promo",
        `site-promo--${variant}`,
        `site-promo--slot-${slotId}`,
        accent !== "default" && `site-promo--accent-${accent}`,
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

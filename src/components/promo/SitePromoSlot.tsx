"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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

const ENTER_MS = 900;
const EXIT_MS = 480;
const SETTLE_MS = 120;

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

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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
  const shellRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [dismissedLocal, setDismissedLocal] = useState(false);
  const [boosting, setBoosting] = useState<boolean | null>(null);
  const [revision, setRevision] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

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

  const readyToShow =
    Boolean(campaign) &&
    !(campaign?.hideWhenBoosting && boosting !== false);

  useEffect(() => {
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

  useEffect(() => {
    if (!readyToShow) {
      setEntered(false);
      if (mounted) {
        const t = window.setTimeout(() => setMounted(false), EXIT_MS);
        return () => window.clearTimeout(t);
      }
      return;
    }
    setMounted(true);
  }, [readyToShow, mounted]);

  /* Measured height expand — avoids grid 0fr/1fr + blur jank on iPhone. */
  useEffect(() => {
    if (!mounted || !readyToShow) return;
    const shell = shellRef.current;
    const card = cardRef.current;
    if (!shell || !card) return;

    if (prefersReducedMotion()) {
      shell.style.height = "auto";
      shell.style.overflow = "visible";
      setEntered(true);
      return;
    }

    let cancelled = false;
    shell.style.overflow = "hidden";
    shell.style.height = "0px";
    shell.style.transition = "none";

    const settle = window.setTimeout(() => {
      if (cancelled) return;
      const target = Math.ceil(card.getBoundingClientRect().height);
      /* Force collapsed paint, then ease to measured px. */
      void shell.offsetHeight;
      shell.style.transition = `height ${ENTER_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      shell.style.height = `${Math.max(target, 1)}px`;
      setEntered(true);

      const onEnd = (event: TransitionEvent) => {
        if (event.propertyName !== "height" || cancelled) return;
        shell.style.height = "auto";
        shell.style.overflow = "visible";
        shell.style.transition = "";
        shell.removeEventListener("transitionend", onEnd);
      };
      shell.addEventListener("transitionend", onEnd);
    }, SETTLE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(settle);
    };
  }, [mounted, readyToShow, campaign?.id]);

  void revision;

  if (!mounted || !campaign) return null;

  function collapseThenDismiss() {
    const token = campaign!.reappearOnSignIn ? signInToken : null;
    dismissPromo(campaign!.id, token);

    const shell = shellRef.current;
    if (!shell || prefersReducedMotion()) {
      setEntered(false);
      setDismissedLocal(true);
      return;
    }

    const current = shell.getBoundingClientRect().height;
    shell.style.overflow = "hidden";
    shell.style.height = `${current}px`;
    void shell.offsetHeight;
    shell.style.transition = `height ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    setEntered(false);
    requestAnimationFrame(() => {
      shell.style.height = "0px";
    });
    window.setTimeout(() => setDismissedLocal(true), EXIT_MS);
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
    <div
      ref={shellRef}
      className={cn("site-promo-enter", entered && "site-promo-enter--in")}
      style={
        {
          "--site-promo-enter-ms": `${ENTER_MS}ms`,
          "--site-promo-exit-ms": `${EXIT_MS}ms`,
        } as CSSProperties
      }
    >
      <aside
        ref={cardRef}
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
            onClick={collapseThenDismiss}
            aria-label="Dismiss promo"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <div className="site-promo__copy">
          <p className="site-promo__eyebrow">{campaign.eyebrow}</p>
          <h2 id={`site-promo-title-${slotId}`} className="site-promo__headline">
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
    </div>
  );
}

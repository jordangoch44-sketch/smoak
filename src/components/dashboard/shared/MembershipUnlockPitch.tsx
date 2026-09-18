"use client";

import {
  useCallback,
  useRef,
  useState,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  CalendarIcon,
  CameraIcon,
  ChartIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  EyeIcon,
  PercentIcon,
  PhotosStackIcon,
  PlayIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { LOGO_ICON_SRC } from "@/lib/brand";
import {
  SMOAC_PRO_BENEFITS,
  SMOAC_PRO_PLUS_BENEFITS,
  SMOAC_PRO_PLUS_PRICE_LABEL,
  SMOAC_PRO_PRICE_LABEL,
  SMOAC_UPGRADE_FOOTER,
  type MembershipBenefit,
  type MembershipUpgradeOffer,
} from "@/lib/specialist-premium";
import { cn } from "@/lib/utils";
import { DashboardButton } from "./DashboardButton";

const UNLOCK_AT = 0.86;
const SLIDE_JOLTS = [0.14, 0.28, 0.42, 0.56, 0.7, 0.84] as const;

const PERK_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "Full profile analytics": ChartIcon,
  "Visibility and ranking intelligence": TrophyIcon,
  "Client engagement metrics": UsersIcon,
  "Free 1st session marketplace placement": CalendarIcon,
  "Growth insights on your live profile": EyeIcon,
  "Intro video above your bio": PlayIcon,
  "Everything in Pro": CheckCircleIcon,
  "Up to 5 phone videos, 45 seconds each": CameraIcon,
  "Client results under Specialties": PhotosStackIcon,
  "20% off Boost campaigns": PercentIcon,
};

const TITLE_ACCENTS = ["keep Pro", "Keep Pro", "PRO+", "Pro"] as const;

export function UpgradeMark() {
  return (
    <span className="dashboard-upgrade__mark" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- official plate crop, paints with the modal */}
      <img
        src={LOGO_ICON_SRC}
        alt=""
        width={64}
        height={64}
        decoding="sync"
        fetchPriority="high"
        className="dashboard-upgrade__s"
      />
    </span>
  );
}

export function UpgradeTitleText({ title }: { title: string }) {
  const accent = TITLE_ACCENTS.find((phrase) => title.includes(phrase));
  if (!accent) return title;
  const index = title.lastIndexOf(accent);
  return (
    <>
      {title.slice(0, index)}
      <span className="dashboard-upgrade__title-accent">{accent}</span>
      {title.slice(index + accent.length)}
    </>
  );
}

export function UpgradePerkList({
  benefits,
}: {
  benefits: readonly MembershipBenefit[];
}) {
  return (
    <ul className="dashboard-upgrade__perks">
      {benefits.map((benefit) => {
        const PerkIcon = PERK_ICONS[benefit.title] ?? CheckIcon;
        return (
          <li key={benefit.title}>
            <span className="dashboard-upgrade__perk-icon-wrap" aria-hidden>
              <PerkIcon className="dashboard-upgrade__perk-icon" />
            </span>
            <span className="dashboard-upgrade__perk-copy">
              <span className="dashboard-upgrade__perk-title">{benefit.title}</span>
              <span className="dashboard-upgrade__perk-detail">{benefit.detail}</span>
            </span>
            <ChevronRightIcon className="dashboard-upgrade__perk-chevron" />
          </li>
        );
      })}
    </ul>
  );
}

export function UpgradeCta({
  children,
  busy,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  busy?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <DashboardButton
      className={cn("dashboard-pro-upgrade-btn dashboard-upgrade__cta", className)}
      onClick={onClick}
      disabled={disabled || busy}
    >
      <span className="dashboard-upgrade__cta-label">{children}</span>
      <span className="dashboard-upgrade__cta-go" aria-hidden>
        <ChevronRightIcon className="dashboard-upgrade__cta-arrow" />
      </span>
    </DashboardButton>
  );
}

export function UpgradeFooter() {
  return <p className="dashboard-upgrade__footer">{SMOAC_UPGRADE_FOOTER}</p>;
}

export type MembershipUnlockKind = "pro" | "restore" | "trial" | "pro-plus";

export function membershipUnlockKindFromOffer(
  offer: MembershipUpgradeOffer,
  trialEnded = false
): MembershipUnlockKind {
  if (trialEnded) return "restore";
  if (offer.tone === "trial") return "trial";
  if (offer.intent === "pro-plus") return "pro-plus";
  return "pro";
}

function unlockCopy(
  kind: MembershipUnlockKind,
  offer?: MembershipUpgradeOffer
): {
  eyebrow: string;
  title: string;
  description: string;
  benefits: readonly MembershipBenefit[];
  sliderLabel: string;
  priceLabel: string | null;
} {
  if (kind === "restore") {
    return {
      eyebrow: "SMOAC Pro",
      title: "Restore Pro",
      description:
        "Your analytics are still here — restore Pro to use them live.",
      benefits: SMOAC_PRO_BENEFITS,
      sliderLabel: "Slide to restore Pro",
      priceLabel: null,
    };
  }
  if (kind === "pro-plus") {
    return {
      eyebrow: offer?.eyebrow ?? "SMOAC PRO+",
      title: offer?.title ?? "Upgrade to PRO+",
      description:
        offer?.description ??
        "PRO+ adds phone videos, client results, and 20% off Boosts.",
      benefits: offer?.benefits ?? SMOAC_PRO_PLUS_BENEFITS,
      sliderLabel: "Unlock PRO+",
      priceLabel: SMOAC_PRO_PLUS_PRICE_LABEL,
    };
  }
  if (kind === "trial") {
    return {
      eyebrow: offer?.eyebrow ?? "Pro trial ending",
      title: offer?.title ?? "Keep Pro",
      description:
        offer?.description ??
        "Subscribe now to keep Pro analytics and growth tools when your trial ends.",
      benefits: offer?.benefits ?? SMOAC_PRO_BENEFITS,
      sliderLabel: "Keep Pro",
      priceLabel: SMOAC_PRO_PRICE_LABEL,
    };
  }
  return {
    eyebrow: "SMOAC Pro",
    title: "Unlock Pro",
    description:
      "See how clients find you, how you rank, and which extras drive inquiries.",
    benefits: SMOAC_PRO_BENEFITS,
    sliderLabel: "Unlock Pro",
    priceLabel: SMOAC_PRO_PRICE_LABEL,
  };
}

function LockToUnlockMark() {
  return (
    <span className="overview-lock-anim" aria-hidden>
      <svg
        className="overview-lock-anim__lock"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path
          className="overview-lock-anim__shackle"
          d="M8 11V8a4 4 0 0 1 8 0v3"
        />
      </svg>
      <svg
        className="overview-lock-anim__open"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 7.2-2.4" />
      </svg>
    </span>
  );
}

function UnlockJolt({ flipped }: { flipped?: boolean }) {
  return (
    <svg
      className={cn(
        "overview-unlock-slide__bolt",
        flipped && "overview-unlock-slide__bolt--flip"
      )}
      viewBox="0 0 24 56"
      aria-hidden
    >
      <path fill="currentColor" d="M12 0 3 26h10L0 56l22-30H11z" />
    </svg>
  );
}

function progressFromPointer(clientX: number, track: HTMLElement) {
  const rect = track.getBoundingClientRect();
  const pad = 6;
  const thumb = 44;
  const max = Math.max(1, rect.width - pad * 2 - thumb);
  return Math.min(1, Math.max(0, (clientX - rect.left - pad - thumb / 2) / max));
}

function OverviewUnlockSlider({
  label,
  priceLabel,
  restoreLayout,
  disabled,
  onUnlock,
}: {
  label: string;
  priceLabel: string | null;
  restoreLayout: boolean;
  disabled?: boolean;
  onUnlock: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const unlockedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  const finishIfUnlocked = useCallback(
    (value: number) => {
      if (disabled) {
        setProgress(0);
        return;
      }
      if (unlockedRef.current || value < UNLOCK_AT) {
        if (!unlockedRef.current) setProgress(0);
        return;
      }
      unlockedRef.current = true;
      setProgress(1);
      window.setTimeout(() => {
        onUnlock();
        unlockedRef.current = false;
        setProgress(0);
      }, 160);
    },
    [disabled, onUnlock]
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || unlockedRef.current || event.button === 2) return;
    draggingRef.current = true;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    setProgress(progressFromPointer(event.clientX, event.currentTarget));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || unlockedRef.current) return;
    setProgress(progressFromPointer(event.clientX, event.currentTarget));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishIfUnlocked(progressFromPointer(event.clientX, event.currentTarget));
  };

  return (
    <div
      ref={trackRef}
      className={cn(
        "overview-unlock-slide",
        restoreLayout && "overview-unlock-slide--restore",
        dragging && "is-dragging",
        progress > 0.08 && "is-charged",
        disabled && "is-disabled"
      )}
      style={{ ["--unlock" as string]: String(progress) }}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-label={label}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          finishIfUnlocked(1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          setProgress((value) => {
            const next = Math.min(1, value + 0.12);
            if (next >= UNLOCK_AT) {
              window.setTimeout(() => finishIfUnlocked(next), 0);
            }
            return next;
          });
        }
        if (event.key === "ArrowLeft" || event.key === "Escape") {
          event.preventDefault();
          setProgress(0);
        }
      }}
    >
      <div className="overview-unlock-slide__well">
        <div className="overview-unlock-slide__trail" aria-hidden />
        <div className="overview-unlock-slide__sparks" aria-hidden>
          {SLIDE_JOLTS.map((offset, index) => (
            <span
              key={offset}
              className={cn(
                "overview-unlock-slide__jolt",
                index % 2 === 1 && "overview-unlock-slide__jolt--down"
              )}
              style={{
                left: `${offset * 100}%`,
                animationDelay: `${index * 0.08}s`,
              }}
            >
              <UnlockJolt flipped={index % 2 === 1} />
            </span>
          ))}
        </div>
        <p className="overview-unlock-slide__label">{label}</p>
        {priceLabel ? (
          <p className="overview-unlock-slide__hint">{priceLabel}</p>
        ) : null}
        <span className="overview-unlock-slide__thumb">
          <ChevronRightIcon className="overview-unlock-slide__chevron" />
        </span>
      </div>
    </div>
  );
}

export function MembershipUnlockPitch({
  kind,
  offer,
  error,
  busy,
  onUnlock,
}: {
  kind: MembershipUnlockKind;
  offer?: MembershipUpgradeOffer;
  error?: string | null;
  busy?: boolean;
  onUnlock: () => void;
}) {
  const copy = unlockCopy(kind, offer);
  const titleId = "membership-unlock-title";
  const descId = "membership-unlock-desc";

  return (
    <div className="dashboard-upgrade specialist-overview-gate__upgrade">
      <div className="dashboard-upgrade__hero">
        <span className="dashboard-upgrade__mark specialist-overview-gate__mark">
          <LockToUnlockMark />
        </span>
        <p className="dashboard-modal__eyebrow dashboard-upgrade__eyebrow">
          {copy.eyebrow}
        </p>
        <h2 id={titleId} className="dashboard-upgrade__title">
          <UpgradeTitleText title={copy.title} />
        </h2>
        <p id={descId} className="dashboard-upgrade__body">
          {copy.description}
        </p>
      </div>

      <UpgradePerkList benefits={copy.benefits} />

      {error ? (
        <p className="dashboard-modal__error" role="alert">
          {error}
        </p>
      ) : null}

      <OverviewUnlockSlider
        label={busy ? "Loading…" : copy.sliderLabel}
        priceLabel={busy ? null : copy.priceLabel}
        restoreLayout={kind === "restore"}
        disabled={busy}
        onUnlock={onUnlock}
      />

      <UpgradeFooter />
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
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
export const UNLOCK_COLLAPSE_MS = 780;

const ELECTRIC_SPIRAL_MAIN =
  "M32.00 28.83 L32.72 29.60 L32.54 31.18 L35.12 29.41 L35.46 30.53 L36.29 31.53 L37.12 32.95 L34.26 33.16 L35.61 35.49 L34.97 37.30 L33.16 37.24 L31.45 39.45 L30.27 36.52 L28.57 36.43 L25.23 36.83 L25.59 34.18 L22.98 32.32 L24.51 30.03 L26.67 28.73 L25.30 24.49 L28.28 24.03 L30.57 22.15 L33.59 21.35 L35.21 25.19 L39.40 23.79 L41.69 26.12 L42.35 29.32 L45.31 32.52 L41.20 35.17 L41.27 38.67 L40.49 43.06 L36.18 43.05 L33.05 46.95 L29.18 44.47 L26.24 42.19 L20.43 43.08 L19.77 38.23 L16.47 34.81 L15.95 30.17 L20.44 27.03 L18.85 20.96 L23.00 18.28 L27.40 16.47 L32.08 12.91 L36.26 18.07 L41.68 17.51 L46.94 19.68 L47.63 25.45 L52.88 29.81 L49.35 35.29 L47.39 40.01 L47.66 47.26 L41.02 48.28 L36.62 53.28 L30.33 53.27 L25.56 48.57 L17.65 50.37 L14.59 44.30 L11.22 38.95 L7.30 32.75 L13.26 26.98 L11.94 19.58 L15.71 13.59 L22.69 11.82 L28.24 5.27 L35.41 9.86 L42.00 11.03 L50.52 11.61 L52.16 19.89 L59.04 25.13 L58.28 33.15 L53.86 39.63 L55.80 49.29";

const ELECTRIC_SPIRAL_INNER =
  "M33.46 30.84 L33.31 31.50 L34.65 31.86 L34.28 32.59 L32.93 32.59 L34.22 34.63 L33.26 35.04 L32.33 35.83 L30.93 36.70 L30.62 34.34 L28.60 35.05 L27.02 34.24 L27.07 32.57 L25.21 30.67 L27.68 29.63 L28.28 28.10 L28.66 25.15 L31.08 25.70 L33.37 23.69 L35.46 25.21 L36.40 27.54 L40.29 27.65 L40.19 30.55 L41.30 33.24 L41.41 36.44 L37.60 37.21 L37.15 41.13 L34.19 42.51 L30.96 42.14 L26.91 43.69 L25.53 39.39 L22.53 37.73 L19.14 35.09 L20.67 31.18 L18.71 26.69 L22.19 23.93 L25.71 22.27 L27.99 17.27 L32.56 18.77 L37.19 17.80 L41.68 19.49 L42.39 24.82 L47.77 27.19 L47.82 32.19 L46.81 36.91 L46.97 42.88 L40.68 43.79 L37.43 48.04 L32.34 50.65 L27.31 47.73 L20.59 48.75 L18.15 42.86 L15.97 37.97";

const ELECTRIC_FORKS = [
  "M39.84 33.59 L43.57 34.80 L47.74 33.40 L50.62 38.45 L55.29 35.78 L59.47 33.37",
  "M33.70 41.85 L34.69 45.23 L35.23 48.69 L32.75 52.49 L41.21 54.16 L31.54 59.50",
  "M25.59 36.79 L22.86 39.62 L18.46 40.14 L16.97 44.74 L14.29 47.59 L6.58 42.48",
  "M23.52 26.70 L20.56 24.84 L18.29 21.95 L13.05 24.18 L14.25 15.84 L7.93 18.70",
  "M33.49 24.14 L34.85 20.45 L34.00 16.33 L35.13 12.55 L40.41 9.95 L29.49 4.62",
  "M40.86 27.35 L44.13 26.07 L46.13 22.54 L51.39 25.34 L52.22 19.07 L55.02 16.95",
] as const;

const ELECTRIC_SPARKS = [
  [18.2, 22.4],
  [46.8, 20.6],
  [50.4, 41.2],
  [22.1, 48.6],
  [12.4, 35.8],
  [39.6, 11.8],
] as const;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function lockUnlockCardSize(card: HTMLElement) {
  const rect = card.getBoundingClientRect();
  const width = `${rect.width}px`;
  const height = `${rect.height}px`;
  card.style.width = width;
  card.style.height = height;
  card.style.maxWidth = width;
  card.style.maxHeight = height;
}

function clearUnlockCardSize(card: HTMLElement) {
  card.style.width = "";
  card.style.height = "";
  card.style.maxWidth = "";
  card.style.maxHeight = "";
}

export function UnlockCheckoutSpiral({
  label = "Opening checkout",
}: {
  label?: string;
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `unlock-arc-${rawId}`;
  const glowId = `unlock-arc-glow-${rawId}`;
  const bloomId = `unlock-arc-bloom-${rawId}`;
  const stroke = `url(#${gradId})`;

  return (
    <span className="overview-unlock-spiral" role="status" aria-live="polite">
      <span className="overview-unlock-spiral__sr">{label}</span>
      <span className="overview-unlock-spiral__core" aria-hidden />
      <svg
        className="overview-unlock-spiral__svg"
        viewBox="0 0 64 64"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="12%" y1="8%" x2="88%" y2="94%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#f5f3ff" />
            <stop offset="58%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.05" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={bloomId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.4" result="bloom" />
            <feMerge>
              <feMergeNode in="bloom" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle className="overview-unlock-spiral__halo" cx="32" cy="32" r="27.5" />
        <path
          className="overview-unlock-spiral__bolt overview-unlock-spiral__bolt--bloom"
          d={ELECTRIC_SPIRAL_MAIN}
          fill="none"
          stroke={stroke}
          filter={`url(#${bloomId})`}
        />
        <path
          className="overview-unlock-spiral__bolt overview-unlock-spiral__bolt--main"
          d={ELECTRIC_SPIRAL_MAIN}
          fill="none"
          stroke={stroke}
          filter={`url(#${glowId})`}
        />
        <path
          className="overview-unlock-spiral__bolt overview-unlock-spiral__bolt--inner"
          d={ELECTRIC_SPIRAL_INNER}
          fill="none"
          stroke={stroke}
          filter={`url(#${glowId})`}
        />
        {ELECTRIC_FORKS.map((d, index) => (
          <path
            key={d}
            className="overview-unlock-spiral__fork"
            d={d}
            fill="none"
            stroke={stroke}
            style={{ animationDelay: `${index * 0.07}s` }}
          />
        ))}
        {ELECTRIC_SPARKS.map(([cx, cy], index) => (
          <circle
            key={`${cx}-${cy}`}
            className="overview-unlock-spiral__spark"
            cx={cx}
            cy={cy}
            r={index % 2 === 0 ? 1.15 : 0.85}
            style={{ animationDelay: `${index * 0.11}s` }}
          />
        ))}
      </svg>
    </span>
  );
}

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
  "Marketplace listing": EyeIcon,
  "Client inquiries": UsersIcon,
  "Public profile": PhotosStackIcon,
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

  useEffect(() => {
    if (disabled) {
      setProgress(1);
      unlockedRef.current = true;
      draggingRef.current = false;
      setDragging(false);
      return;
    }
    unlockedRef.current = false;
    if (!draggingRef.current) setProgress(0);
  }, [disabled]);

  const finishIfUnlocked = useCallback(
    (value: number) => {
      if (disabled) return;
      if (unlockedRef.current || value < UNLOCK_AT) {
        if (!unlockedRef.current) setProgress(0);
        return;
      }
      unlockedRef.current = true;
      setProgress(1);
      window.setTimeout(() => {
        onUnlock();
      }, 180);
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
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const card = rootRef.current?.closest<HTMLElement>(".smoac-unlock-pitch");
    if (!card) return;

    if (!busy) {
      card.classList.remove("is-minimized");
      if (prefersReducedMotion()) {
        clearUnlockCardSize(card);
        card.classList.remove("is-minimizing");
        return;
      }
      const restore = (event: TransitionEvent) => {
        if (event.propertyName !== "height" && event.propertyName !== "width") {
          return;
        }
        clearUnlockCardSize(card);
        card.classList.remove("is-minimizing");
      };
      card.addEventListener("transitionend", restore);
      const fallback = window.setTimeout(() => {
        clearUnlockCardSize(card);
        card.classList.remove("is-minimizing");
      }, UNLOCK_COLLAPSE_MS + 80);
      return () => {
        card.removeEventListener("transitionend", restore);
        window.clearTimeout(fallback);
      };
    }

    if (prefersReducedMotion()) {
      card.classList.add("is-minimizing", "is-minimized");
      return;
    }

    if (card.classList.contains("is-minimized")) return;

    lockUnlockCardSize(card);
    card.classList.add("is-minimizing");
    let innerFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        card.classList.add("is-minimized");
      });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(innerFrame);
    };
  }, [busy]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "dashboard-upgrade specialist-overview-gate__upgrade",
        busy && "is-unlocking"
      )}
      aria-busy={busy || undefined}
    >
      <div className="dashboard-upgrade__unlock-copy">
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
          label={copy.sliderLabel}
          priceLabel={busy ? null : copy.priceLabel}
          restoreLayout={kind === "restore"}
          disabled={busy}
          onUnlock={onUnlock}
        />

        <UpgradeFooter />
      </div>

      <div className="dashboard-upgrade__spiral-slot" aria-hidden={!busy}>
        <UnlockCheckoutSpiral />
      </div>
    </div>
  );
}

import type { Transition, Variants } from "framer-motion";
import {
  BOTTOM_NAV_PANEL_MS,
  BOTTOM_NAV_PANEL_TOUCH_MS,
  type BottomNavPanelDirection,
} from "@/lib/mobile-bottom-nav-transition";

/** Primary ease — long luxury deceleration */
export const PAGE_TRANSITION_EASE = [0.1, 0.92, 0.2, 1] as const;

/** Vertical settle — soft landing */
export const PAGE_TRANSITION_EASE_SETTLE = [0.08, 0.88, 0.18, 1] as const;

/** Blur / frost dissolve — resolves last */
export const PAGE_TRANSITION_EASE_FROST = [0.12, 1, 0.28, 1] as const;

export function isTrainerProfilePath(pathname: string): boolean {
  return /^\/trainers\/[^/]+$/.test(pathname);
}

export function isSavedPath(pathname: string): boolean {
  return pathname === "/saved";
}

/** Desktop — frosted materialize; blur trails opacity */
export const desktopPageTransition: Transition = {
  opacity: { duration: 0.72, ease: PAGE_TRANSITION_EASE },
  y: { duration: 0.8, ease: PAGE_TRANSITION_EASE_SETTLE },
  scale: { duration: 0.84, ease: PAGE_TRANSITION_EASE },
  filter: { duration: 0.92, ease: PAGE_TRANSITION_EASE_FROST },
};

/** Mobile — opacity/y only (no filter: Safari GPU + tap reliability) */
export const mobilePageTransition: Transition = {
  opacity: { duration: 0.22, ease: PAGE_TRANSITION_EASE },
  y: { duration: 0.24, ease: PAGE_TRANSITION_EASE_SETTLE },
};

/** Bottom nav stacked panels — iOS sheet / Wallet depth */
export const BOTTOM_NAV_PANEL_EASE = [0.32, 0.72, 0, 1] as const;

/** Bottom nav panels — opacity + y only (Safari-friendly) */
export function buildBottomNavPanelTransition(fastMotion = false): Transition {
  const durationSec = (fastMotion ? BOTTOM_NAV_PANEL_TOUCH_MS : BOTTOM_NAV_PANEL_MS) / 1000;
  return {
    opacity: { duration: durationSec * 0.95, ease: BOTTOM_NAV_PANEL_EASE },
    y: { duration: durationSec, ease: BOTTOM_NAV_PANEL_EASE },
  };
}

/** @deprecated Use buildBottomNavPanelTransition */
export const bottomNavPanelTransition: Transition =
  buildBottomNavPanelTransition(false);

export const bottomNavPanelReducedTransition: Transition = {
  duration: 0.14,
  ease: "easeOut",
};

export function buildBottomNavPanelVariants(
  direction: BottomNavPanelDirection
): Variants {
  const enterY = direction === 1 ? 10 : -8;
  const exitY = direction === 1 ? -5 : 6;

  return {
    initial: { opacity: 0, y: enterY },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: exitY },
  };
}

export const bottomNavPanelReducedVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

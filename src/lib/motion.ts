import type { Transition } from "framer-motion";

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

/** Mobile — no scale; slower frost fade */
export const mobilePageTransition: Transition = {
  opacity: { duration: 0.68, ease: PAGE_TRANSITION_EASE },
  y: { duration: 0.74, ease: PAGE_TRANSITION_EASE_SETTLE },
  filter: { duration: 0.86, ease: PAGE_TRANSITION_EASE_FROST },
};

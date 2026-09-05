import { MODAL_OPEN_BODY_CLASS } from "@/lib/blocking-modal";

/**
 * Body classes that lock scroll or indicate full-screen chrome overlays.
 * Keep in sync with scroll-lock rules in globals.css and modal-open.css.
 */

export const CHROME_BODY_OVERLAY_CLASSES = [
  "menu-open",
  "saved-panel-open",
  "drawer-open",
  "explore-search-open",
  "location-selector-open",
  "profile-sheet-open",
  "inquiry-sheet-open",
  "login-gate-open",
  "site-location-gate-open",
  "complete-account-lock",
  "site-intro-open",
  "gallery-modal-open",
  "profile-image-preview-open",
  "admin-review-open",
  MODAL_OPEN_BODY_CLASS,
] as const;

export type ChromeBodyOverlayClass = (typeof CHROME_BODY_OVERLAY_CLASSES)[number];

export function isChromeBodyOverlayActive(): boolean {
  if (typeof document === "undefined") return false;
  return CHROME_BODY_OVERLAY_CLASSES.some((className) =>
    document.body.classList.contains(className)
  );
}

/** Overlay class → live root. Missing root means the class was left behind. */
const STALE_OVERLAY_ROOTS: ReadonlyArray<readonly [string, string]> = [
  ["profile-sheet-open", ".profile-sheet-root"],
  ["profile-sheet-dismissing", ".profile-sheet-root"],
  ["site-intro-open", ".smoac-welcome-intro"],
  ["login-gate-open", ".login-gate"],
  ["site-location-gate-open", ".site-location-gate"],
  ["complete-account-lock", ".complete-account-lock-shell, .login-page--complete-account"],
];

/** Drop overlay body classes whose UI is gone — leftover classes eat Search taps. */
export function scrubStaleChromeBodyOverlays(): void {
  if (typeof document === "undefined") return;
  for (const [className, selector] of STALE_OVERLAY_ROOTS) {
    if (!document.body.classList.contains(className)) continue;
    if (document.querySelector(selector)) continue;
    document.body.classList.remove(className);
    document.documentElement.classList.remove(className);
  }
}

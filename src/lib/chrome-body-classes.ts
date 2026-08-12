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

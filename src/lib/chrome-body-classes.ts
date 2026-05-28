/**
 * Body classes that lock scroll or indicate full-screen chrome overlays.
 * Keep in sync with scroll-lock rules in globals.css.
 */

export const CHROME_BODY_OVERLAY_CLASSES = [
  "menu-open",
  "saved-panel-open",
  "drawer-open",
  "login-gate-open",
  "site-intro-open",
  "location-personalization-open",
  "hero-search-suggestions-open",
  "gallery-modal-open",
  "admin-review-open",
  "bottom-nav-directory-active",
] as const;

export type ChromeBodyOverlayClass = (typeof CHROME_BODY_OVERLAY_CLASSES)[number];

export function isChromeBodyOverlayActive(): boolean {
  if (typeof document === "undefined") return false;
  return CHROME_BODY_OVERLAY_CLASSES.some((className) =>
    document.body.classList.contains(className)
  );
}

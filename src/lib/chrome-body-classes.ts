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
  "inquiry-inbox-open",
  "specialist-edit-profile-open",
  "login-gate-open",
  "site-location-gate-open",
  "complete-account-lock",
  "site-intro-open",
  "gallery-modal-open",
  "profile-image-preview-open",
  "admin-review-open",
  "client-workouts-open",
  MODAL_OPEN_BODY_CLASS,
] as const;

export type ChromeBodyOverlayClass = (typeof CHROME_BODY_OVERLAY_CLASSES)[number];

export function isChromeBodyOverlayActive(): boolean {
  if (typeof document === "undefined") return false;
  return CHROME_BODY_OVERLAY_CLASSES.some((className) =>
    document.body.classList.contains(className)
  );
}

/**
 * Overlay class → live root. Missing root means the class was left behind.
 * Exited / pass-through profile sheets are not live — they must not keep
 * `profile-sheet-open` (that class sets pointer-events:none on `.app-main`).
 */
const LIVE_PROFILE_SHEET_ROOT =
  ".profile-sheet-root:not(.profile-sheet-root--exited):not(.profile-sheet-root--pass-through), .profile-intercept-page";

const STALE_OVERLAY_ROOTS: ReadonlyArray<readonly [string, string]> = [
  ["profile-sheet-open", LIVE_PROFILE_SHEET_ROOT],
  ["profile-sheet-dismissing", ".profile-sheet-root:not(.profile-sheet-root--exited)"],
  ["site-intro-open", ".smoac-welcome-intro"],
  ["login-gate-open", ".login-gate"],
  ["site-location-gate-open", ".site-location-gate"],
  ["complete-account-lock", ".complete-account-lock-shell, .login-page--complete-account"],
  ["client-workouts-open", ".client-workouts-root"],
  ["inquiry-inbox-open", ".inquiry-inbox-page"],
  ["specialist-edit-profile-open", ".specialist-edit-profile-page"],
];

function nudgeAppMainHitTesting(main: HTMLElement): void {
  const previous = main.style.pointerEvents;
  main.style.pointerEvents = "none";
  void main.offsetHeight;
  main.style.pointerEvents = previous;
}

/**
 * Drop leftover profile-sheet chrome that keeps Marketplace / Search / map
 * preview cards from receiving taps (`inert` + body classes).
 */
export function restoreListingPointerAccess(options?: {
  forceNudge?: boolean;
}): void {
  if (typeof document === "undefined") return;
  const liveSheet = document.querySelector(LIVE_PROFILE_SHEET_ROOT);
  const dismissingSheet = document.querySelector(
    ".profile-sheet-root.profile-sheet-root--pass-through"
  );
  const main = document.querySelector(".app-main");

  if (liveSheet) {
    return;
  }

  let hadLeftover = Boolean(options?.forceNudge);
  if (
    document.body.classList.contains("profile-sheet-open") ||
    document.documentElement.classList.contains("profile-sheet-open")
  ) {
    hadLeftover = true;
  }
  document.body.classList.remove("profile-sheet-open");
  document.documentElement.classList.remove("profile-sheet-open");

  if (!dismissingSheet) {
    if (document.body.classList.contains("profile-sheet-dismissing")) {
      hadLeftover = true;
    }
    document.body.classList.remove("profile-sheet-dismissing");
  }

  if (main instanceof HTMLElement && main.hasAttribute("inert")) {
    hadLeftover = true;
    main.removeAttribute("inert");
  }

  if (hadLeftover && main instanceof HTMLElement) {
    nudgeAppMainHitTesting(main);
  }
}

/** Drop overlay body classes whose UI is gone — leftover classes eat Search taps. */
export function scrubStaleChromeBodyOverlays(): void {
  if (typeof document === "undefined") return;
  for (const [className, selector] of STALE_OVERLAY_ROOTS) {
    if (!document.body.classList.contains(className)) continue;
    if (document.querySelector(selector)) continue;
    document.body.classList.remove(className);
    document.documentElement.classList.remove(className);
  }
  restoreListingPointerAccess();
}

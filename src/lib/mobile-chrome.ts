/**
 * Mobile chrome helpers — body scroll lock and per-route scroll cache for bottom nav.
 */

import {
  isExploreNavPath,
  isProfileNavPath,
} from "@/lib/mobile-bottom-nav";

const scrollPositions = new Map<string, number>();

let pinGeneration = 0;

function pathnameFromRouteKey(key: string): string {
  const q = key.indexOf("?");
  return q === -1 ? key : key.slice(0, q);
}

function shouldResetScrollOnEnter(pathname: string): boolean {
  return isProfileNavPath(pathname) || isExploreNavPath(pathname);
}

/** Immediate scroll-to-top across window + common scrollports. */
export function forceDocumentScrollTop(): void {
  if (typeof window === "undefined") return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const main = document.querySelector(".app-main");
  if (main instanceof HTMLElement) main.scrollTop = 0;
}

/**
 * Keep window scroll at 0 across the next paints.
 * Needed when entering Search after a scrolled page — iOS can re-apply the
 * previous offset after the first scrollTo, which floats the map shell.
 */
export function pinDocumentScrollTop(durationMs = 600): void {
  if (typeof window === "undefined") return;
  const token = ++pinGeneration;
  forceDocumentScrollTop();

  requestAnimationFrame(() => {
    if (token !== pinGeneration) return;
    forceDocumentScrollTop();
    requestAnimationFrame(() => {
      if (token !== pinGeneration) return;
      forceDocumentScrollTop();
    });
  });

  for (const delay of [50, 100, 200, 400, 600, 800]) {
    if (delay > durationMs) break;
    window.setTimeout(() => {
      if (token !== pinGeneration) return;
      forceDocumentScrollTop();
    }, delay);
  }
}

/**
 * Call before router.push to Search/Profile so the next route paints at y=0
 * (SSR/loading HTML can inherit the previous page's scroll before hydration).
 */
export function prepareNavScrollReset(pathname: string): void {
  if (typeof window === "undefined") return;
  if (!shouldResetScrollOnEnter(pathname)) return;
  try {
    history.scrollRestoration = "manual";
  } catch {
    /* ignore */
  }
  forceDocumentScrollTop();
  pinDocumentScrollTop(400);
}

export function getClientRouteSearch(): string {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

/** Locks page scroll while bottom-nav panel slide is active */
export function setBottomNavPanelBodyActive(active: boolean): void {
  if (typeof document === "undefined") return;
  document.body.classList.toggle("bottom-nav-panel-active", active);
  document.documentElement.classList.toggle("bottom-nav-panel-active", active);
}

export function saveBottomNavScroll(key: string): void {
  if (typeof window === "undefined") return;
  /* Profile + Search always reopen at the top — don't cache mid-page scroll. */
  if (shouldResetScrollOnEnter(pathnameFromRouteKey(key))) {
    scrollPositions.delete(key);
    return;
  }
  scrollPositions.set(key, window.scrollY);
}

export function restoreBottomNavScroll(key: string): void {
  if (typeof window === "undefined") return;

  if (shouldResetScrollOnEnter(pathnameFromRouteKey(key))) {
    scrollPositions.delete(key);
    pinDocumentScrollTop();
    return;
  }

  const y = scrollPositions.get(key);
  if (y === undefined) {
    /* First visit after a scrolled page — clear inherited window offset */
    pinDocumentScrollTop();
    return;
  }
  requestAnimationFrame(() => {
    window.scrollTo(0, y);
  });
}

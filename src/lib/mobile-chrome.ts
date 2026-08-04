/**
 * Mobile chrome helpers — body scroll lock and per-route scroll cache for bottom nav.
 */

import { isProfileNavPath } from "@/lib/mobile-bottom-nav";

const scrollPositions = new Map<string, number>();

function pathnameFromRouteKey(key: string): string {
  const q = key.indexOf("?");
  return q === -1 ? key : key.slice(0, q);
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
  /* Profile should always reopen at the top — don't cache mid-page scroll. */
  if (isProfileNavPath(pathnameFromRouteKey(key))) {
    scrollPositions.delete(key);
    return;
  }
  scrollPositions.set(key, window.scrollY);
}

export function restoreBottomNavScroll(key: string): void {
  if (typeof window === "undefined") return;

  if (isProfileNavPath(pathnameFromRouteKey(key))) {
    scrollPositions.delete(key);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    return;
  }

  const y = scrollPositions.get(key);
  if (y === undefined) return;
  requestAnimationFrame(() => {
    window.scrollTo(0, y);
  });
}

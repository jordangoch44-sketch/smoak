/**
 * Mobile chrome helpers — body scroll lock and per-route scroll cache for bottom nav.
 */

import {
  isExploreNavPath,
  isProfileNavPath,
} from "@/lib/mobile-bottom-nav";

const scrollPositions = new Map<string, number>();

function pathnameFromRouteKey(key: string): string {
  const q = key.indexOf("?");
  return q === -1 ? key : key.slice(0, q);
}

function shouldResetScrollOnEnter(pathname: string): boolean {
  return isProfileNavPath(pathname) || isExploreNavPath(pathname);
}

function forceScrollTop(): void {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const main = document.querySelector(".app-main");
  if (main instanceof HTMLElement) main.scrollTop = 0;
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
    requestAnimationFrame(() => {
      forceScrollTop();
    });
    return;
  }

  const y = scrollPositions.get(key);
  if (y === undefined) {
    /* First visit after a scrolled page — clear inherited window offset */
    requestAnimationFrame(() => {
      forceScrollTop();
    });
    return;
  }
  requestAnimationFrame(() => {
    window.scrollTo(0, y);
  });
}

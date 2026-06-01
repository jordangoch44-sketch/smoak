/**
 * Mobile chrome helpers — body scroll lock and per-route scroll cache for bottom nav.
 */

const scrollPositions = new Map<string, number>();

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
  scrollPositions.set(key, window.scrollY);
}

export function restoreBottomNavScroll(key: string): void {
  const y = scrollPositions.get(key);
  if (y === undefined || typeof window === "undefined") return;
  requestAnimationFrame(() => {
    window.scrollTo(0, y);
  });
}

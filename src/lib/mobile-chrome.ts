/**
 * Mobile chrome helpers — body classes, route keys, scroll cache for bottom nav.
 */

const scrollPositions = new Map<string, number>();

export const BOTTOM_NAV_DIRECTORY_BODY_ATTR = "data-bottom-nav-transition";

export function getClientRouteSearch(): string {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

export function setBottomNavDirectoryBodyActive(active: boolean): void {
  if (typeof document === "undefined") return;

  if (active) {
    document.body.setAttribute(BOTTOM_NAV_DIRECTORY_BODY_ATTR, "directory");
    document.documentElement.setAttribute(
      BOTTOM_NAV_DIRECTORY_BODY_ATTR,
      "directory"
    );
    document.body.classList.add("bottom-nav-directory-active");
    document.documentElement.classList.add("bottom-nav-directory-active");
  } else {
    document.body.removeAttribute(BOTTOM_NAV_DIRECTORY_BODY_ATTR);
    document.documentElement.removeAttribute(BOTTOM_NAV_DIRECTORY_BODY_ATTR);
    document.body.classList.remove("bottom-nav-directory-active");
    document.documentElement.classList.remove("bottom-nav-directory-active");
  }
}

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

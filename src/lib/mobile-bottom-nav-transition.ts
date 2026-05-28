import type { MobileBottomNavItemId } from "@/lib/mobile-bottom-nav";

export type BottomNavTransitionKind = "none" | "directory" | "panel";

/** Layered panel slide — default bottom nav motion */
export const BOTTOM_NAV_PANEL_MS = 420;

export const BOTTOM_NAV_PANEL_REDUCED_MS = 140;

/** Cinematic directory loader — Search → Explore only */
export const BOTTOM_NAV_DIRECTORY_TOTAL_MS = 2500;

export const BOTTOM_NAV_DIRECTORY_OUT_MS = 450;

export const BOTTOM_NAV_DIRECTORY_REDUCED_TOTAL_MS = 720;

export const BOTTOM_NAV_DIRECTORY_REDUCED_OUT_MS = 180;

const TAB_ORDER: MobileBottomNavItemId[] = [
  "search",
  "saved",
  "home",
  "discover",
  "profile",
];

export type BottomNavPanelDirection = 1 | -1;

export function getBottomNavPanelDirection(
  fromId: MobileBottomNavItemId,
  toId: MobileBottomNavItemId
): BottomNavPanelDirection {
  const fromIndex = TAB_ORDER.indexOf(fromId);
  const toIndex = TAB_ORDER.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return 1;
  return toIndex > fromIndex ? 1 : -1;
}

export function parseBottomNavHref(href: string): { pathname: string; search: string } {
  const [pathname, search = ""] = href.split("?");
  return { pathname, search: search ? `?${search}` : "" };
}

export function getBottomNavRouteKey(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export function isSameBottomNavDestination(
  pathname: string,
  searchParams: URLSearchParams,
  href: string
): boolean {
  const target = parseBottomNavHref(href);
  if (pathname !== target.pathname) return false;

  if (target.pathname === "/explore" && target.search.includes("focus=search")) {
    return searchParams.get("focus") === "search";
  }

  if (target.search) {
    const targetParams = new URLSearchParams(target.search.slice(1));
    for (const [key, value] of targetParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  }

  return searchParams.toString().length === 0;
}

/** Search → Explore uses cinematic loader; other tabs use panel slides */
export function getBottomNavTransitionKind(
  itemId: MobileBottomNavItemId,
  pathname: string,
  searchParams: URLSearchParams,
  href: string
): BottomNavTransitionKind {
  if (isSameBottomNavDestination(pathname, searchParams, href)) return "none";
  if (itemId === "search") return "directory";
  return "panel";
}

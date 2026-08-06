import type { MobileBottomNavItemId } from "@/lib/mobile-bottom-nav";

export type BottomNavTransitionKind = "none" | "panel";

/** Lightweight panel slide — transform + opacity only (tablet / fine pointer) */
export const BOTTOM_NAV_PANEL_MS = 160;

/** Snappier on coarse-pointer devices when panel still runs */
export const BOTTOM_NAV_PANEL_TOUCH_MS = 120;

export const BOTTOM_NAV_PANEL_REDUCED_MS = 80;

const TAB_ORDER: MobileBottomNavItemId[] = [
  "home",
  "search",
  "saved",
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

  if (target.pathname === "/explore") {
    const targetFocusSearch = target.search.includes("focus=search");
    const currentFocusSearch = searchParams.get("focus") === "search";
    return targetFocusSearch === currentFocusSearch;
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

/** All bottom-nav route changes use the same lightweight panel slide */
export function getBottomNavTransitionKind(
  _itemId: MobileBottomNavItemId,
  pathname: string,
  searchParams: URLSearchParams,
  href: string
): BottomNavTransitionKind {
  if (isSameBottomNavDestination(pathname, searchParams, href)) return "none";
  return "panel";
}

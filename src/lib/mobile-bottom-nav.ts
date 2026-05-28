import {
  getDashboardPathForRole,
  isDashboardPath,
} from "@/lib/auth-routes";
import { SITE_ROUTES } from "@/lib/navigation";
import type { AuthSession } from "@/types/auth";
import { getUserRole, isLoggedIn } from "@/lib/specialist-saves";

export type MobileBottomNavItemId =
  | "search"
  | "saved"
  | "home"
  | "discover"
  | "profile";

export interface MobileBottomNavItem {
  id: MobileBottomNavItemId;
  href: string;
  label: string;
  isPrimary?: boolean;
}

export function getMobileBottomNavItems(
  session: AuthSession | null
): MobileBottomNavItem[] {
  const signedIn = isLoggedIn(session);
  const role = getUserRole(session);
  const profileHref =
    signedIn && role ? getDashboardPathForRole(role) : SITE_ROUTES.login;

  return [
    {
      id: "search",
      href: SITE_ROUTES.exploreSearchFocus,
      label: "Search",
    },
    { id: "saved", href: SITE_ROUTES.saved, label: "Saved" },
    { id: "home", href: SITE_ROUTES.home, label: "Home", isPrimary: true },
    { id: "discover", href: SITE_ROUTES.discover, label: "Discover" },
    { id: "profile", href: profileHref, label: "Profile" },
  ];
}

/** Profile tab auth presentation — derived from session + client hydration */
export type MobileBottomNavProfileAuthState = "signed-in" | "signed-out";

export function getMobileBottomNavProfileAuthState(
  clientReady: boolean,
  authReady: boolean,
  session: AuthSession | null
): MobileBottomNavProfileAuthState {
  if (!clientReady || !authReady) return "signed-out";
  return isLoggedIn(session) ? "signed-in" : "signed-out";
}

/** Active bottom-nav tab for panel direction + scroll keys */
export function getActiveMobileBottomNavItemId(
  pathname: string,
  searchParams?: URLSearchParams
): MobileBottomNavItemId | null {
  const ids: MobileBottomNavItemId[] = [
    "search",
    "saved",
    "home",
    "discover",
    "profile",
  ];

  for (const id of ids) {
    if (id === "search" && searchParams?.get("focus") === "search") {
      if (
        pathname === SITE_ROUTES.explore ||
        pathname.startsWith(`${SITE_ROUTES.explore}/`)
      ) {
        return "search";
      }
      continue;
    }

    if (isMobileBottomNavItemActive(id, pathname)) {
      return id;
    }
  }

  return null;
}

export function isMobileBottomNavItemActive(
  itemId: MobileBottomNavItemId,
  pathname: string
): boolean {
  switch (itemId) {
    case "home":
      return pathname === SITE_ROUTES.home;
    case "search":
      return (
        pathname === SITE_ROUTES.explore ||
        pathname.startsWith(`${SITE_ROUTES.explore}/`)
      );
    case "saved":
      return (
        pathname === SITE_ROUTES.saved ||
        pathname.startsWith(`${SITE_ROUTES.saved}/`)
      );
    case "discover":
      return (
        pathname === SITE_ROUTES.discover ||
        pathname.startsWith(`${SITE_ROUTES.discover}/`)
      );
    case "profile":
      return (
        pathname === SITE_ROUTES.login ||
        isDashboardPath(pathname) ||
        pathname.startsWith("/create-account")
      );
    default:
      return false;
  }
}

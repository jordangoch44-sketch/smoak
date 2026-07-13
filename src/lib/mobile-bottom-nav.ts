import {
  CLIENT_DASHBOARD_PATH,
  getDashboardPathForRole,
  isDashboardPath,
  LOGIN_PATH,
  SPECIALIST_DASHBOARD_PATH,
} from "@/lib/auth-routes";
import { SITE_ROUTES } from "@/lib/navigation";
import type { AuthSession } from "@/types/auth";
import { getUserRole, isLoggedIn } from "@/lib/specialist-saves";
import { getInitials } from "@/lib/utils";

export type MobileBottomNavItemId =
  | "search"
  | "saved"
  | "home"
  | "join"
  | "profile";

export interface MobileBottomNavItem {
  id: MobileBottomNavItemId;
  href: string;
  label: string;
  isPrimary?: boolean;
}

/** Routes that activate the Login / Profile bottom-nav tab */
const PROFILE_NAV_PATHS = [
  LOGIN_PATH,
  "/signin",
  "/profile",
  CLIENT_DASHBOARD_PATH,
  SPECIALIST_DASHBOARD_PATH,
] as const;

function isProfileNavPath(pathname: string): boolean {
  if (isDashboardPath(pathname)) return true;

  return PROFILE_NAV_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
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
    { id: "join", href: SITE_ROUTES.join, label: "Join" },
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

export type MobileBottomNavProfilePresentation =
  | { kind: "icon" }
  | { kind: "avatar"; avatarUrl: string; initials: string }
  | { kind: "initials"; initials: string };

function profileNavInitials(session: AuthSession): string {
  const fromDisplay = session.displayName?.trim() ?? "";
  if (fromDisplay) {
    const initials = getInitials(fromDisplay);
    if (initials) return initials;
  }
  const fromFirst = session.firstName?.trim() ?? "";
  if (fromFirst) {
    const initials = getInitials(fromFirst);
    if (initials) return initials;
  }
  const local = session.email.split("@")[0]?.trim() ?? "";
  return getInitials(local || "U") || "U";
}

/** Avatar / initials / outline icon for the Profile tab. */
export function getMobileBottomNavProfilePresentation(
  authState: MobileBottomNavProfileAuthState,
  session: AuthSession | null
): MobileBottomNavProfilePresentation {
  if (authState !== "signed-in" || !session || !isLoggedIn(session)) {
    return { kind: "icon" };
  }

  const initials = profileNavInitials(session);
  const avatarUrl = session.avatarUrl?.trim() ?? "";
  if (avatarUrl) {
    return { kind: "avatar", avatarUrl, initials };
  }
  return { kind: "initials", initials };
}

/**
 * Single source of truth for bottom-nav active state.
 * Pass searchParams when resolving the Search tab (`/explore?focus=search`).
 */
export function isActiveNavItem(
  itemId: MobileBottomNavItemId,
  pathname: string,
  searchParams?: URLSearchParams | null
): boolean {
  switch (itemId) {
    case "home":
      return pathname === SITE_ROUTES.home;
    case "search":
      if (searchParams?.get("focus") === "search") {
        return (
          pathname === SITE_ROUTES.explore ||
          pathname.startsWith(`${SITE_ROUTES.explore}/`)
        );
      }
      return false;
    case "saved":
      return (
        pathname === SITE_ROUTES.saved ||
        pathname.startsWith(`${SITE_ROUTES.saved}/`)
      );
    case "join":
      return pathname.startsWith("/create-account");
    case "profile":
      return isProfileNavPath(pathname);
    default:
      return false;
  }
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
    "join",
    "profile",
  ];

  for (const id of ids) {
    if (isActiveNavItem(id, pathname, searchParams)) {
      return id;
    }
  }

  return null;
}

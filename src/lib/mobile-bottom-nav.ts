import {
  CLIENT_DASHBOARD_PATH,
  getDashboardPathForRole,
  isDashboardPath,
  LOGIN_PATH,
  SPECIALIST_DASHBOARD_PATH,
} from "@/lib/auth-routes";
import { JOIN_FLOW_PATH } from "@/lib/join-flow";
import { SITE_ROUTES } from "@/lib/navigation";
import type { AuthSession } from "@/types/auth";
import { getUserRole, isLoggedIn } from "@/lib/specialist-saves";
import { getInitials } from "@/lib/utils";

export type MobileBottomNavItemId =
  | "home"
  | "search"
  | "saved"
  | "profile";

export interface MobileBottomNavItem {
  id: MobileBottomNavItemId;
  href: string;
  label: string;
  isPrimary?: boolean;
}

/** Routes that activate the Profile bottom-nav tab */
const PROFILE_NAV_PATHS = [
  SITE_ROUTES.profile,
  LOGIN_PATH,
  "/signin",
  JOIN_FLOW_PATH,
  CLIENT_DASHBOARD_PATH,
  SPECIALIST_DASHBOARD_PATH,
] as const;

export function isProfileNavPath(pathname: string): boolean {
  if (isDashboardPath(pathname)) return true;

  return PROFILE_NAV_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isExplorePath(pathname: string): boolean {
  return (
    pathname === SITE_ROUTES.explore ||
    pathname.startsWith(`${SITE_ROUTES.explore}/`)
  );
}

/** Search tab — map shell must open at scroll 0 */
export function isExploreNavPath(pathname: string): boolean {
  return isExplorePath(pathname);
}

export function getMobileBottomNavItems(
  session: AuthSession | null
): MobileBottomNavItem[] {
  const signedIn = isLoggedIn(session);
  const role = getUserRole(session);
  const profileHref =
    signedIn && role ? getDashboardPathForRole(role) : SITE_ROUTES.profile;

  return [
    { id: "home", href: SITE_ROUTES.home, label: "Marketplace", isPrimary: true },
    {
      id: "search",
      href: SITE_ROUTES.exploreSearchFocus,
      label: "Search",
    },
    { id: "saved", href: SITE_ROUTES.saved, label: "Favorites" },
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
  session: AuthSession | null,
  /** Specialist live profile photo when session.avatarUrl is empty */
  profilePhotoUrl?: string | null
): MobileBottomNavProfilePresentation {
  if (authState !== "signed-in" || !session || !isLoggedIn(session)) {
    return { kind: "icon" };
  }

  const initials = profileNavInitials(session);
  const avatarUrl =
    session.avatarUrl?.trim() ||
    profilePhotoUrl?.trim() ||
    "";
  if (avatarUrl && !avatarUrl.includes("placeholder")) {
    return { kind: "avatar", avatarUrl, initials };
  }
  return { kind: "initials", initials };
}

/**
 * Single source of truth for bottom-nav active state.
 * Search owns all `/explore` routes (Specialists tab removed).
 */
export function isActiveNavItem(
  itemId: MobileBottomNavItemId,
  pathname: string,
  _searchParams?: URLSearchParams | null
): boolean {
  switch (itemId) {
    case "home":
      return pathname === SITE_ROUTES.home;
    case "search":
      return isExplorePath(pathname);
    case "saved":
      return (
        pathname === SITE_ROUTES.saved ||
        pathname.startsWith(`${SITE_ROUTES.saved}/`)
      );
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
    "home",
    "search",
    "saved",
    "profile",
  ];

  for (const id of ids) {
    if (isActiveNavItem(id, pathname, searchParams)) {
      return id;
    }
  }

  return null;
}

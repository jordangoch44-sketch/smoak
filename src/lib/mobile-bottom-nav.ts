import {
  CLIENT_DASHBOARD_PATH,
  getDashboardPathForRole,
  LOGIN_PATH,
  SPECIALIST_DASHBOARD_OVERVIEW_HREF,
  SPECIALIST_DASHBOARD_PATH,
  SPECIALIST_DASHBOARD_PROFILE_TAB_HREF,
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

export type MobileBottomNavGlyph = "home" | "search" | "heart" | "chart" | "user";

export interface MobileBottomNavItem {
  id: MobileBottomNavItemId;
  href: string;
  label: string;
  glyph?: MobileBottomNavGlyph;
  isPrimary?: boolean;
}

/** Routes that activate the Profile bottom-nav tab (not specialist overview). */
const PROFILE_NAV_PATHS = [
  SITE_ROUTES.profile,
  LOGIN_PATH,
  "/signin",
  JOIN_FLOW_PATH,
  CLIENT_DASHBOARD_PATH,
] as const;

export function isProfileNavPath(pathname: string): boolean {
  if (
    pathname === CLIENT_DASHBOARD_PATH ||
    pathname.startsWith(`${CLIENT_DASHBOARD_PATH}/`)
  ) {
    return true;
  }

  return PROFILE_NAV_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function isSpecialistDashboardPath(pathname: string): boolean {
  return (
    pathname === SPECIALIST_DASHBOARD_PATH ||
    pathname.startsWith(`${SPECIALIST_DASHBOARD_PATH}/`)
  );
}

function specialistDashboardTab(
  searchParams?: URLSearchParams | null
): string | null {
  const tab = searchParams?.get("tab")?.trim().toLowerCase() ?? "";
  return tab || null;
}

/** Edit-profile or `?tab=profile` or default specialist dashboard route — Profile tab, not Overview. */
export function isSpecialistDashboardProfileTab(
  pathname: string,
  searchParams?: URLSearchParams | null
): boolean {
  if (
    pathname === `${SPECIALIST_DASHBOARD_PATH}/edit-profile` ||
    pathname.startsWith(`${SPECIALIST_DASHBOARD_PATH}/edit-profile/`)
  ) {
    return true;
  }
  if (pathname !== SPECIALIST_DASHBOARD_PATH) return false;
  const tab = specialistDashboardTab(searchParams);
  return tab !== "overview" && tab !== "plan";
}

/** Specialist dashboard overview / plan tab — Favorites slot when logged in. */
export function isSpecialistDashboardOverviewTab(
  pathname: string,
  searchParams?: URLSearchParams | null
): boolean {
  if (pathname !== SPECIALIST_DASHBOARD_PATH) return false;
  const tab = specialistDashboardTab(searchParams);
  return tab === "overview" || tab === "plan";
}

function isExplorePath(pathname: string): boolean {
  return (
    pathname === SITE_ROUTES.explore ||
    pathname.startsWith(`${SITE_ROUTES.explore}/`)
  );
}

/** Marketplace tab / homepage — always open at scroll 0 */
export function isHomeNavPath(pathname: string): boolean {
  return pathname === SITE_ROUTES.home || pathname === "";
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
  const isSpecialist = role === "specialist";
  const profileHref =
    signedIn && role
      ? isSpecialist
        ? SPECIALIST_DASHBOARD_PROFILE_TAB_HREF
        : getDashboardPathForRole(role)
      : SITE_ROUTES.profile;

  return [
    { id: "home", href: SITE_ROUTES.home, label: "Marketplace", isPrimary: true },
    {
      id: "search",
      href: SITE_ROUTES.exploreSearchFocus,
      label: "Search",
    },
    isSpecialist
      ? {
          id: "saved",
          href: SPECIALIST_DASHBOARD_OVERVIEW_HREF,
          label: "Overview",
          glyph: "chart",
        }
      : { id: "saved", href: SITE_ROUTES.saved, label: "Favorites", glyph: "heart" },
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
 * Specialists: Favorites slot = dashboard overview; Profile = edit-profile tab.
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
      return isExplorePath(pathname);
    case "saved":
      return (
        pathname === SITE_ROUTES.saved ||
        pathname.startsWith(`${SITE_ROUTES.saved}/`) ||
        isSpecialistDashboardOverviewTab(pathname, searchParams)
      );
    case "profile":
      return (
        isProfileNavPath(pathname) ||
        isSpecialistDashboardProfileTab(pathname, searchParams)
      );
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

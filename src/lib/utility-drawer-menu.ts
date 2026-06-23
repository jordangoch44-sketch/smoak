import {
  getDashboardPathForRole,
  isDashboardPath,
  LOGIN_PATH,
} from "@/lib/auth-routes";
import type { PublicAuthRole } from "@/types/auth-roles";
import { SITE_ROUTES } from "@/lib/navigation";

export type UtilityDrawerPrimaryId =
  | "home"
  | "explore"
  | "saved"
  | "rankings"
  | "events"
  | "dashboard";

export interface UtilityDrawerNavItem {
  id: string;
  label: string;
  description?: string;
  /** null = coming soon / placeholder (non-navigable) */
  href: string | null;
}

export interface UtilityDrawerPrimaryItem extends UtilityDrawerNavItem {
  id: UtilityDrawerPrimaryId;
  description: string;
}

export function getUtilityDrawerPrimaryLinks(
  dashboardHref: string
): UtilityDrawerPrimaryItem[] {
  return [
    {
      id: "home",
      label: "Home",
      description: "Return to the main search page",
      href: SITE_ROUTES.home,
    },
    {
      id: "explore",
      label: "Explore Specialists",
      description: "Search by specialty, city, or style",
      href: SITE_ROUTES.explore,
    },
    {
      id: "saved",
      label: "Saved Specialists",
      description: "View your shortlisted professionals",
      href: SITE_ROUTES.saved,
    },
    {
      id: "rankings",
      label: "Top 50 Rankings",
      description: "See top-rated specialists in your city",
      href: SITE_ROUTES.rankings,
    },
    {
      id: "events",
      label: "Events",
      description: "Wellness events — coming soon",
      href: null,
    },
    {
      id: "dashboard",
      label: "Dashboard",
      description: "Manage your profile and account",
      href: dashboardHref,
    },
  ];
}

export const utilityDrawerSecondaryLinks: readonly UtilityDrawerNavItem[] = [
  { id: "about", label: "About SMOAC", href: null },
  { id: "contact", label: "Contact", href: null },
  { id: "support", label: "Support", href: null },
  { id: "settings", label: "Settings", href: null },
];

export const utilityDrawerLegalLinks: readonly UtilityDrawerNavItem[] = [
  { id: "privacy", label: "Privacy Policy", href: null },
  { id: "terms", label: "Terms of Service", href: null },
  { id: "cookies", label: "Cookie Policy", href: null },
  { id: "accessibility", label: "Accessibility", href: null },
];

export function resolveUtilityDrawerDashboardHref(
  signedIn: boolean,
  role: PublicAuthRole | null
): string {
  if (signedIn && role) return getDashboardPathForRole(role);
  return LOGIN_PATH;
}

export function isUtilityDrawerPrimaryActive(
  id: UtilityDrawerPrimaryId,
  pathname: string
): boolean {
  switch (id) {
    case "home":
      return pathname === SITE_ROUTES.home;
    case "explore":
      return (
        pathname === SITE_ROUTES.explore ||
        pathname.startsWith(`${SITE_ROUTES.explore}/`)
      );
    case "saved":
      return (
        pathname === SITE_ROUTES.saved ||
        pathname.startsWith(`${SITE_ROUTES.saved}/`)
      );
    case "rankings":
      return (
        pathname === SITE_ROUTES.rankings ||
        pathname.startsWith(`${SITE_ROUTES.rankings}/`)
      );
    case "events":
      return false;
    case "dashboard":
      return (
        isDashboardPath(pathname) ||
        pathname === LOGIN_PATH
      );
    default:
      return false;
  }
}

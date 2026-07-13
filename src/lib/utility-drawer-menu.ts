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
  | "events";

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

export interface UtilityDrawerAccountCard {
  href: string;
  title: string;
  subtitle: string;
  variant: "profile" | "auth";
}

/** Primary nav order: Explore → Saved → Rankings → Events → Home (profile is featured separately). */
export function getUtilityDrawerPrimaryLinks(): UtilityDrawerPrimaryItem[] {
  return [
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
      id: "home",
      label: "Home",
      description: "Return to the main search page",
      href: SITE_ROUTES.home,
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

function displayFirstName(
  firstName?: string | null,
  displayName?: string | null
): string {
  const fromFirst = firstName?.trim() ?? "";
  if (fromFirst) return fromFirst;
  const fromDisplay = displayName?.trim().split(/\s+/)[0] ?? "";
  return fromDisplay;
}

/** Featured account card at the top of the mobile menu. */
export function getUtilityDrawerAccountCard(options: {
  signedIn: boolean;
  role: PublicAuthRole | null;
  firstName?: string | null;
  displayName?: string | null;
}): UtilityDrawerAccountCard {
  const { signedIn, role, firstName, displayName } = options;
  const href = resolveUtilityDrawerDashboardHref(signedIn, role);

  if (!signedIn) {
    return {
      href: LOGIN_PATH,
      title: "Log In / Create Account",
      subtitle: "Sign in to save specialists and manage your account.",
      variant: "auth",
    };
  }

  const name = displayFirstName(firstName, displayName);

  if (role === "specialist") {
    return {
      href,
      title: name || "My Profile",
      subtitle: name
        ? "View and manage your specialist profile"
        : "Manage your profile, account, applications, and settings.",
      variant: "profile",
    };
  }

  return {
    href,
    title: "My Profile",
    subtitle: name
      ? `Welcome back, ${name}`
      : "Manage your profile, account, applications, and settings.",
    variant: "profile",
  };
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
    default:
      return false;
  }
}

export function isUtilityDrawerAccountActive(pathname: string): boolean {
  return isDashboardPath(pathname);
}

import {
  CLIENT_DASHBOARD_PATH,
  getDashboardPathForRole,
  isDashboardPath,
  SPECIALIST_DASHBOARD_PATH,
} from "@/lib/auth-routes";
import type { PublicAuthRole } from "@/types/auth-roles";

export const UTILITY_DRAWER_APP_VERSION = "0.1.0";

export interface UtilityDrawerNavItem {
  id: string;
  label: string;
  description?: string;
  /** null = placeholder (non-navigable / coming soon) */
  href: string | null;
}

export interface UtilityDrawerAccountCard {
  href: string | null;
  title: string;
  subtitle: string;
  actionLabel: string;
  variant: "profile" | "auth";
  email?: string;
  avatarUrl?: string | null;
  initials: string;
}

/** Company + support rows — not bottom-nav destinations */
export const utilityDrawerCompanyLinks: readonly UtilityDrawerNavItem[] = [
  {
    id: "about",
    label: "About SMOAC",
    description: "Our mission and marketplace",
    href: null,
  },
  {
    id: "support",
    label: "Help & Support",
    description: "Questions and assistance",
    href: null,
  },
];

export const utilityDrawerLegalLinks: readonly UtilityDrawerNavItem[] = [
  { id: "privacy", label: "Privacy Policy", href: null },
  { id: "terms", label: "Terms of Service", href: null },
];

function displayFirstName(
  firstName?: string | null,
  displayName?: string | null
): string {
  const fromFirst = firstName?.trim() ?? "";
  if (fromFirst) return fromFirst;
  const fromDisplay = displayName?.trim().split(/\s+/)[0] ?? "";
  return fromDisplay;
}

function initialsFrom(
  firstName?: string | null,
  displayName?: string | null,
  email?: string | null
): string {
  const name = firstName?.trim() || displayName?.trim() || "";
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const local = email?.trim().split("@")[0] ?? "";
  return local.slice(0, 2).toUpperCase() || "SM";
}

/** Featured account card at the top of the mobile menu. */
export function getUtilityDrawerAccountCard(options: {
  signedIn: boolean;
  role: PublicAuthRole | null;
  firstName?: string | null;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}): UtilityDrawerAccountCard {
  const { signedIn, role, firstName, displayName, email, avatarUrl } = options;
  const initials = initialsFrom(firstName, displayName, email);

  if (!signedIn) {
    return {
      href: null,
      title: "Sign In / Create Account",
      subtitle:
        "Save specialists, send inquiries, compare professionals, and manage your account.",
      actionLabel: "Continue",
      variant: "auth",
      initials: "SM",
    };
  }

  const name = displayFirstName(firstName, displayName);
  const profileHref =
    role === "specialist"
      ? `${SPECIALIST_DASHBOARD_PATH}/edit-profile`
      : role
        ? getDashboardPathForRole(role)
        : CLIENT_DASHBOARD_PATH;

  if (role === "specialist") {
    return {
      href: profileHref,
      title: name || displayName?.trim() || "My Profile",
      subtitle: email?.trim() || "Specialist account",
      actionLabel: "View & Edit Profile",
      variant: "profile",
      email: email?.trim() || undefined,
      avatarUrl,
      initials,
    };
  }

  return {
    href: profileHref,
    title: name || "My Profile",
    subtitle: email?.trim() || "Client account",
    actionLabel: "View & Edit Profile",
    variant: "profile",
    email: email?.trim() || undefined,
    avatarUrl,
    initials,
  };
}

export function isUtilityDrawerAccountActive(pathname: string): boolean {
  return isDashboardPath(pathname) || pathname === "/profile";
}

export function getSpecialistAnalyticsHref(): string {
  return SPECIALIST_DASHBOARD_PATH;
}

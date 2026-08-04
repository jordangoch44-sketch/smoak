/**
 * Site navigation — single source of truth for routes and nav configs.
 * Desktop: primary header links + saved/profile controls.
 * Mobile: bottom bar (primary) + utility drawer (secondary).
 */

import { LOGIN_PATH } from "@/lib/auth-routes";
import { buildJoinFlowHref } from "@/lib/join-flow";

/** Canonical app routes used across chrome */
export const SITE_ROUTES = {
  home: "/",
  explore: "/explore",
  exploreSearchFocus: "/explore?focus=search",
  saved: "/saved",
  profile: "/profile",
  discover: "/discover",
  rankings: "/rankings",
  login: LOGIN_PATH,
  join: buildJoinFlowHref(),
  about: "/about",
  support: "/support",
  contact: "/contact",
  faq: "/faq",
  pricing: "/pricing",
  safety: "/safety",
  communityGuidelines: "/community-guidelines",
  report: "/report",
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookies",
  accessibility: "/accessibility",
} as const;

/** Desktop header text links (saved uses heart control) */
export const navLinks = [
  { href: SITE_ROUTES.home, label: "Marketplace" },
  { href: SITE_ROUTES.explore, label: "Explore" },
  { href: SITE_ROUTES.saved, label: "Saved" },
] as const;

export const primaryNavLinks = navLinks.filter(
  (link) => link.href !== SITE_ROUTES.saved
);

/** Overlay / drawer transition easing */
export const MENU_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

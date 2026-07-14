/**
 * Site navigation — single source of truth for routes and nav configs.
 * Desktop: primary header links + saved/profile controls.
 * Mobile: bottom bar (primary) + utility drawer (secondary).
 */

import { LOGIN_PATH } from "@/lib/auth-routes";
import { JOIN_FLOW_PATH, buildJoinFlowHref } from "@/lib/join-flow";

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
} as const;

/** Desktop header text links (saved uses heart control) */
export const navLinks = [
  { href: SITE_ROUTES.home, label: "Home" },
  { href: SITE_ROUTES.explore, label: "Explore" },
  { href: SITE_ROUTES.saved, label: "Saved" },
] as const;

export const primaryNavLinks = navLinks.filter(
  (link) => link.href !== SITE_ROUTES.saved
);

/** Overlay / drawer transition easing */
export const MENU_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

/** @deprecated Use SITE_ROUTES.join — kept for any external imports */
export { JOIN_FLOW_PATH, buildJoinFlowHref };

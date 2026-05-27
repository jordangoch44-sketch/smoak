/** Site-wide navigation config (used by Navbar + mobile menu). */

import { JOIN_FLOW_PATH, buildJoinFlowHref } from "@/lib/join-flow";

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/saved", label: "Saved" },
] as const;

/** Primary header links (Saved uses the heart control) */
export const primaryNavLinks = navLinks.filter(
  (link) => link.href !== "/saved"
);

/** Mobile hamburger links (includes Join; Saved is a separate control) */
export const mobileHamburgerLinks = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  {
    href: buildJoinFlowHref(),
    label: "Join",
    matchPath: JOIN_FLOW_PATH,
  },
] as const;

/** Apple-style easing for mobile overlay transitions */
export const MENU_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

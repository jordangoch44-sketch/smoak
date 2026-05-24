/** Site-wide navigation config (used by Navbar + mobile menu). */

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/saved", label: "Saved" },
] as const;

/** Primary header links (Saved uses the heart control) */
export const primaryNavLinks = navLinks.filter(
  (link) => link.href !== "/saved"
);

/** Apple-style easing for mobile overlay transitions */
export const MENU_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

import { SITE_ROUTES } from "@/lib/navigation";

/** Core bottom-nav destinations — prefetch after first paint on tablet/phone */
export const BOTTOM_NAV_PREFETCH_ROUTES: readonly string[] = [
  SITE_ROUTES.home,
  SITE_ROUTES.exploreSearchFocus,
  SITE_ROUTES.saved,
  SITE_ROUTES.profile,
  SITE_ROUTES.join,
  SITE_ROUTES.login,
  "/client-dashboard",
  "/specialist-dashboard",
  "/specialist-dashboard?tab=profile",
] as const;

export function prefetchBottomNavRoutes(
  prefetch: (href: string) => void
): void {
  for (const href of BOTTOM_NAV_PREFETCH_ROUTES) {
    try {
      prefetch(href);
    } catch {
      /* prefetch is best-effort */
    }
  }
}

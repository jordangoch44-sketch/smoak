import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { isTrainerProfilePath } from "@/lib/motion";
import { SITE_ROUTES } from "@/lib/navigation";
import { trackProfileSheetReturnPath } from "@/lib/profile-sheet-return";
import { TABLET_MAX_WIDTH_QUERY } from "@/lib/viewport";

let queuedDesktopProfileHref: string | null = null;

export function queueDesktopProfilePopup(href: string): void {
  queuedDesktopProfileHref = href;
}

export function peekDesktopProfilePopup(): string | null {
  return queuedDesktopProfileHref;
}

export function clearDesktopProfilePopup(): void {
  queuedDesktopProfileHref = null;
}

export function isDesktopMarketplaceViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    !window.matchMedia(TABLET_MAX_WIDTH_QUERY).matches
  );
}

function isExplorePath(pathname: string): boolean {
  return pathname === SITE_ROUTES.explore;
}

/**
 * Desktop card taps land on Search with the profile popup on top.
 * Mobile / tablet keep the existing `/trainers/[id]` sheet intercept.
 */
export function openMarketplaceProfileSheet(
  href: string,
  router: Pick<AppRouterInstance, "push" | "prefetch"> &
    Partial<Pick<AppRouterInstance, "replace">>,
  options?: { replace?: boolean }
): void {
  if (
    isDesktopMarketplaceViewport() &&
    !isExplorePath(window.location.pathname) &&
    !isTrainerProfilePath(window.location.pathname)
  ) {
    queueDesktopProfilePopup(href);
    trackProfileSheetReturnPath(SITE_ROUTES.explore);
    try {
      router.prefetch(href);
    } catch {
      /* prefetch is best-effort */
    }
    router.push(SITE_ROUTES.explore, { scroll: false });
    return;
  }

  if (options?.replace && router.replace) {
    router.replace(href, { scroll: false });
    return;
  }
  router.push(href, { scroll: false });
}

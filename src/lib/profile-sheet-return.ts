import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { isTrainerProfilePath } from "@/lib/motion";
import { prepareNavScrollReset } from "@/lib/mobile-chrome";
import { SITE_ROUTES } from "@/lib/navigation";

/**
 * Where the profile sheet should land when the user hits X.
 * Picks replace the specialist in-place and must not overwrite this.
 */
let returnHref = SITE_ROUTES.explore;

function normalizeHref(pathname: string, search = ""): string {
  const path = pathname.trim() || SITE_ROUTES.home;
  const query = search.startsWith("?") ? search : search ? `?${search}` : "";
  return `${path}${query}`;
}

export function trackProfileSheetReturnPath(pathname: string, search = ""): void {
  if (isTrainerProfilePath(pathname)) return;
  returnHref = normalizeHref(pathname, search);
}

export function getProfileSheetReturnPath(): string {
  const href = returnHref.trim() || SITE_ROUTES.explore;
  const pathname = href.split("?")[0] || SITE_ROUTES.explore;
  if (isTrainerProfilePath(pathname)) return SITE_ROUTES.explore;
  return href;
}

/** Close the sheet onto the page that opened it — never walk trainer history. */
export function navigateToProfileSheetReturn(
  router: Pick<AppRouterInstance, "replace">
): void {
  const href = getProfileSheetReturnPath();
  const pathname = href.split("?")[0] || SITE_ROUTES.explore;
  prepareNavScrollReset(pathname);
  try {
    router.replace(href);
  } catch {
    if (typeof window !== "undefined") window.location.assign(href);
  }
}

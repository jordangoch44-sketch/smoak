"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { isExploreNavPath } from "@/lib/mobile-bottom-nav";
import {
  disarmExploreMapShellScrollLock,
  setBottomNavPanelBodyActive,
} from "@/lib/mobile-chrome";
import { trackProfileSheetReturnPath } from "@/lib/profile-sheet-return";

/** Clears stale scroll locks when leaving Search or after interrupted tab transitions. */
export function SiteRouteScrollHygiene() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      trackProfileSheetReturnPath(pathname, window.location.search);
    }
    if (!isExploreNavPath(pathname)) {
      disarmExploreMapShellScrollLock();
    }
    setBottomNavPanelBodyActive(false);
  }, [pathname]);

  return null;
}

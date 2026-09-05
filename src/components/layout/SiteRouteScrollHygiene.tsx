"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { isExploreNavPath } from "@/lib/mobile-bottom-nav";
import {
  disarmExploreMapShellScrollLock,
  setBottomNavPanelBodyActive,
} from "@/lib/mobile-chrome";
import { scrubStaleChromeBodyOverlays } from "@/lib/chrome-body-classes";
import { notifyExploreMapLayout } from "@/lib/explore-map-layout";
import { trackProfileSheetReturnPath } from "@/lib/profile-sheet-return";

/** Clears stale scroll locks when leaving Search or after interrupted tab transitions. */
export function SiteRouteScrollHygiene() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      trackProfileSheetReturnPath(pathname, window.location.search);
    }
    scrubStaleChromeBodyOverlays();
    if (!isExploreNavPath(pathname)) {
      disarmExploreMapShellScrollLock();
    } else {
      notifyExploreMapLayout();
    }
    setBottomNavPanelBodyActive(false);
  }, [pathname]);

  return null;
}

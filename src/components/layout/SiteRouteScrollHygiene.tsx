"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { isExploreNavPath } from "@/lib/mobile-bottom-nav";
import {
  disarmExploreMapShellScrollLock,
  setBottomNavPanelBodyActive,
} from "@/lib/mobile-chrome";

/** Clears stale scroll locks when leaving Search or after interrupted tab transitions. */
export function SiteRouteScrollHygiene() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!isExploreNavPath(pathname)) {
      disarmExploreMapShellScrollLock();
    }
    setBottomNavPanelBodyActive(false);
  }, [pathname]);

  return null;
}

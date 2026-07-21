"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordSiteVisit } from "@/lib/site-visit-tracking";

/** Records one anonymous page view per route change (admin traffic analytics). */
export function SiteVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    recordSiteVisit(pathname);
  }, [pathname]);

  return null;
}

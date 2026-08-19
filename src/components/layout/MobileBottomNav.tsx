"use client";

import { memo } from "react";
import { SiteNavPill } from "@/components/layout/SiteNavPill";
import { useMobileBottomNavHidden } from "@/hooks/useMobileBottomNavHidden";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { cn } from "@/lib/utils";

function MobileBottomNavShell() {
  const hidden = useMobileBottomNavHidden();
  /* Mobile-first SSR — avoid a blank frame where the main toolbar is missing */
  const isTabletViewport = useTabletViewport(true);

  if (!isTabletViewport) return null;

  return (
    <nav
      className={cn("mobile-bottom-nav", hidden && "mobile-bottom-nav--hidden")}
      aria-label="Mobile navigation"
      aria-hidden={hidden}
    >
      <div className="mobile-bottom-nav__scrim" aria-hidden />

      <div className="mobile-bottom-nav__float">
        <SiteNavPill />
      </div>
    </nav>
  );
}

export const MobileBottomNav = memo(MobileBottomNavShell);

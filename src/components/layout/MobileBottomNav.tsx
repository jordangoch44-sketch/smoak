"use client";

import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SiteNavPill } from "@/components/layout/SiteNavPill";
import { useMobileBottomNavHidden } from "@/hooks/useMobileBottomNavHidden";
import { useTabletViewport } from "@/hooks/useTabletViewport";
import { cn } from "@/lib/utils";

function MobileBottomNavShell() {
  const hidden = useMobileBottomNavHidden();
  /* Mobile-first SSR — avoid a blank frame where the main toolbar is missing */
  const isTabletViewport = useTabletViewport(true);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  if (!isTabletViewport) return null;

  const nav = (
    <nav
      className={cn("mobile-bottom-nav", hidden && "mobile-bottom-nav--hidden")}
      aria-label="Mobile navigation"
      aria-hidden={hidden}
    >
      <div className="mobile-bottom-nav__float">
        <SiteNavPill />
      </div>
    </nav>
  );

  /* Portal to body so #root overflow-x:clip cannot trap position:fixed on iOS. */
  return portalTarget ? createPortal(nav, portalTarget) : nav;
}

export const MobileBottomNav = memo(MobileBottomNavShell);

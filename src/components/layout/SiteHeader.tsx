"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { useHeaderPanels } from "@/hooks/useHeaderPanels";
import { useSiteHeaderScroll } from "@/hooks/useSiteHeaderScroll";
import {
  getMobileMaxWidthSnapshot,
  subscribeMobileMaxWidth,
} from "@/lib/viewport";
import { SiteHeaderMobile } from "./SiteHeaderMobile";
import { SiteHeaderDesktop } from "./SiteHeaderDesktop";
import { HeaderOverlayRoot } from "./HeaderOverlayRoot";
import { SavedPanelDropdown } from "./SavedPanelDropdown";

function getMobileSnapshot(): boolean {
  return getMobileMaxWidthSnapshot();
}

/**
 * Site header — mobile utility bar + desktop navigation.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const panels = useHeaderPanels();
  const isMobile = useSyncExternalStore(
    subscribeMobileMaxWidth,
    getMobileSnapshot,
    () => false
  );

  useSiteHeaderScroll(isMobile);

  const chromeActive = panels.menuOpen || panels.savedPanelOpen;

  return (
    <>
      <header
        id="site-header"
        className={cn(
          "site-header",
          isMobile && "site-header--utility",
          chromeActive && "site-header--panel-open"
        )}
      >
        <div className="site-header--mobile md:hidden">
          <SiteHeaderMobile
            menuOpen={panels.menuOpen}
            onLogoClick={panels.onLogoClick}
            onMenuClick={panels.onMenuClick}
          />
        </div>

        <nav
          className={cn(
            "site-header--desktop site-navbar hidden border-b backdrop-blur-xl md:block",
            panels.savedPanelOpen ? "border-white/10" : "border-white/5"
          )}
          aria-label="Main"
        >
          <SiteHeaderDesktop
            savedPanelOpen={panels.savedPanelOpen}
            onSavedClick={panels.onSavedClick}
            onCloseSavedPanel={panels.closeSavedPanel}
            isHomePage={isHomePage}
          />
        </nav>

        {panels.savedPanelOpen ? (
          <div className="hidden md:block">
            <SavedPanelDropdown open onClose={panels.closeSavedPanel} />
          </div>
        ) : null}
      </header>

      <HeaderOverlayRoot
        menuOpen={panels.menuOpen}
        savedPanelOpen={panels.savedPanelOpen}
        onCloseMenu={panels.closeMenu}
        onCloseSaved={panels.closeSavedPanel}
      />
    </>
  );
}

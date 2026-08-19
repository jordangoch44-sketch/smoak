"use client";

import { cn } from "@/lib/utils";
import { useHeaderPanels } from "@/hooks/useHeaderPanels";
import { useSiteHeaderScroll } from "@/hooks/useSiteHeaderScroll";
import { SiteHeaderMobile } from "./SiteHeaderMobile";
import { SiteHeaderDesktop } from "./SiteHeaderDesktop";
import { HeaderOverlayRoot } from "./HeaderOverlayRoot";

/**
 * Site header — mobile/tablet utility bar + bottom nav; desktop utility bar + nav pill.
 */
export function SiteHeader() {
  const panels = useHeaderPanels();

  useSiteHeaderScroll(true);

  const chromeActive = panels.menuOpen || panels.savedPanelOpen;

  return (
    <>
      <header
        id="site-header"
        className={cn(
          "site-header",
          "site-header--utility",
          chromeActive && "site-header--panel-open"
        )}
      >
        <div className="site-header--mobile lg:hidden">
          <SiteHeaderMobile onLogoClick={panels.onLogoClick} />
        </div>

        <div className="site-header--desktop hidden lg:block">
          <SiteHeaderDesktop onLogoClick={panels.onLogoClick} />
        </div>
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

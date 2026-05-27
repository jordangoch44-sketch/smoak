"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useHeaderPanels } from "@/hooks/useHeaderPanels";
import { SiteHeaderMobile } from "./SiteHeaderMobile";
import { SiteHeaderDesktop } from "./SiteHeaderDesktop";
import { HeaderOverlayRoot } from "./HeaderOverlayRoot";
import { SavedPanelDropdown } from "./SavedPanelDropdown";

/**
 * Single site header — mobile fixed toolbar + desktop nav.
 * Overlays render via HeaderOverlayRoot (mobile only).
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const panels = useHeaderPanels();

  return (
    <>
      <header
        id="site-header"
        className={cn(
          "site-header border-b",
          panels.menuOpen || panels.savedPanelOpen || panels.profileMenuOpen
            ? "border-white/10"
            : "border-white/5"
        )}
      >
        <div className="site-header--mobile md:hidden">
          <SiteHeaderMobile
            menuOpen={panels.menuOpen}
            savedPanelOpen={panels.savedPanelOpen}
            profileMenuOpen={panels.profileMenuOpen}
            onLogoClick={panels.onLogoClick}
            onSavedClick={panels.onSavedClick}
            onProfileClick={panels.onProfileClick}
            onMenuClick={panels.onMenuClick}
          />
        </div>

        <nav
          className={cn(
            "site-header--desktop site-navbar hidden border-b backdrop-blur-xl md:block",
            panels.savedPanelOpen || panels.profileMenuOpen
              ? "border-white/10"
              : "border-white/5"
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
        pathname={pathname}
        menuOpen={panels.menuOpen}
        savedPanelOpen={panels.savedPanelOpen}
        profileMenuOpen={panels.profileMenuOpen}
        onCloseMenu={panels.closeMenu}
        onCloseSaved={panels.closeSavedPanel}
        onCloseProfile={panels.closeProfileMenu}
        onOpenSavedFromMenu={panels.openSavedFromMenu}
      />
    </>
  );
}

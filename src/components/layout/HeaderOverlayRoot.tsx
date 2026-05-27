"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getMobileMaxWidthSnapshot,
  subscribeMobileMaxWidth,
} from "@/lib/viewport";
import { MobileNavMenu } from "./MobileNavMenu";
import { MobileHeaderProfileMenu } from "./MobileHeaderProfileMenu";
import { SavedPanelDropdown } from "./SavedPanelDropdown";

interface HeaderOverlayRootProps {
  pathname: string;
  menuOpen: boolean;
  savedPanelOpen: boolean;
  profileMenuOpen: boolean;
  onCloseMenu: () => void;
  onCloseSaved: () => void;
  onCloseProfile: () => void;
  onOpenSavedFromMenu: () => void;
}

/**
 * Mobile header panels — portaled below fixed header; CSS hides on md+ (no JS viewport gate).
 */
export function HeaderOverlayRoot({
  pathname,
  menuOpen,
  savedPanelOpen,
  profileMenuOpen,
  onCloseMenu,
  onCloseSaved,
  onCloseProfile,
  onOpenSavedFromMenu,
}: HeaderOverlayRootProps) {
  const [mounted, setMounted] = useState(false);
  const mobileOverlay = useSyncExternalStore(
    subscribeMobileMaxWidth,
    getMobileMaxWidthSnapshot,
    () => false
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (!menuOpen && !savedPanelOpen && !profileMenuOpen) return null;

  return createPortal(
    <div id="header-overlay-root" className="md:hidden" data-header-overlay>
      {menuOpen ? (
        <MobileNavMenu
          open
          pathname={pathname}
          onClose={onCloseMenu}
          onOpenSavedPanel={onOpenSavedFromMenu}
          savedPanelOpen={savedPanelOpen}
        />
      ) : null}
      {mobileOverlay && savedPanelOpen ? (
        <SavedPanelDropdown open onClose={onCloseSaved} />
      ) : null}
      {profileMenuOpen ? (
        <>
          <button
            type="button"
            className="smoac-control header-profile-menu__backdrop"
            aria-label="Close account menu"
            onClick={onCloseProfile}
          />
          <MobileHeaderProfileMenu
            className="header-profile-menu"
            onClose={onCloseProfile}
          />
        </>
      ) : null}
    </div>,
    document.body
  );
}

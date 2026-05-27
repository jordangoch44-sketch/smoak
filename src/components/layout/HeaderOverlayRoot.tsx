"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getMobileMaxWidthSnapshot,
  subscribeMobileMaxWidth,
} from "@/lib/viewport";
import { MobileUtilityDrawer } from "./MobileUtilityDrawer";
import { SavedPanelDropdown } from "./SavedPanelDropdown";

interface HeaderOverlayRootProps {
  menuOpen: boolean;
  savedPanelOpen: boolean;
  onCloseMenu: () => void;
  onCloseSaved: () => void;
}

/**
 * Header overlays — mobile utility drawer; desktop saved specialists panel.
 */
export function HeaderOverlayRoot({
  menuOpen,
  savedPanelOpen,
  onCloseMenu,
  onCloseSaved,
}: HeaderOverlayRootProps) {
  const [mounted, setMounted] = useState(false);
  const isMobile = useSyncExternalStore(
    subscribeMobileMaxWidth,
    getMobileMaxWidthSnapshot,
    () => false
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (!menuOpen && !savedPanelOpen) return null;

  return createPortal(
    <div id="header-overlay-root" data-header-overlay>
      {isMobile && menuOpen ? (
        <div className="header-overlay-root__mobile md:hidden">
          <MobileUtilityDrawer open onClose={onCloseMenu} />
        </div>
      ) : null}

      {!isMobile && savedPanelOpen ? (
        <div className="header-overlay-root__desktop hidden md:block">
          <SavedPanelDropdown open onClose={onCloseSaved} />
        </div>
      ) : null}
    </div>,
    document.body
  );
}

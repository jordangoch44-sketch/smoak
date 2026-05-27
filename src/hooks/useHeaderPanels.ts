"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { subscribeMobileMaxWidth } from "@/lib/viewport";

/** Header panel state — mobile utility menu + desktop saved panel */
export function useHeaderPanels() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);

  const anyPanelOpen = menuOpen || savedPanelOpen;

  const closeAll = useCallback(() => {
    setMenuOpen(false);
    setSavedPanelOpen(false);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeSavedPanel = useCallback(() => setSavedPanelOpen(false), []);

  useEffect(() => {
    closeAll();
  }, [pathname, closeAll]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    document.body.classList.toggle("saved-panel-open", savedPanelOpen);
    return () => document.body.classList.remove("saved-panel-open");
  }, [savedPanelOpen]);

  useEffect(() => {
    return subscribeMobileMaxWidth(() => {
      closeAll();
    });
  }, [closeAll]);

  useEffect(() => {
    if (!anyPanelOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [anyPanelOpen, closeAll]);

  useEffect(() => {
    if (!anyPanelOpen) return;

    function isHeaderTarget(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) return false;
      return (
        target.closest("[data-header-btn]") != null ||
        target.closest("[data-header-control]") != null ||
        target.closest("#site-header") != null ||
        target.closest("[data-header-overlay-panel]") != null ||
        target.closest("#header-overlay-root") != null ||
        target.closest(".nav-profile__menu") != null
      );
    }

    function onOutside(e: Event) {
      if (isHeaderTarget(e.target)) return;
      closeAll();
    }

    document.addEventListener("click", onOutside);

    return () => {
      document.removeEventListener("click", onOutside);
    };
  }, [anyPanelOpen, closeAll]);

  const onLogoClick = useCallback(() => {
    closeAll();
  }, [closeAll]);

  const onSavedClick = useCallback(() => {
    setMenuOpen(false);
    setSavedPanelOpen((open) => !open);
  }, []);

  const onMenuClick = useCallback(() => {
    setSavedPanelOpen(false);
    setMenuOpen((open) => !open);
  }, []);

  return {
    menuOpen,
    savedPanelOpen,
    anyPanelOpen,
    closeAll,
    closeMenu,
    closeSavedPanel,
    onLogoClick,
    onSavedClick,
    onMenuClick,
  };
}

"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { subscribeMobileMaxWidth } from "@/lib/viewport";

/** Header panel state — shared mobile + desktop */
export function useHeaderPanels() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const anyPanelOpen = menuOpen || savedPanelOpen || profileMenuOpen;

  const closeAll = useCallback(() => {
    setMenuOpen(false);
    setSavedPanelOpen(false);
    setProfileMenuOpen(false);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeSavedPanel = useCallback(() => setSavedPanelOpen(false), []);
  const closeProfileMenu = useCallback(() => setProfileMenuOpen(false), []);

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
    document.body.classList.toggle("profile-menu-open", profileMenuOpen);
    return () => document.body.classList.remove("profile-menu-open");
  }, [profileMenuOpen]);

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
    setProfileMenuOpen(false);
    setSavedPanelOpen((open) => !open);
  }, []);

  const onProfileClick = useCallback(() => {
    setMenuOpen(false);
    setSavedPanelOpen(false);
    setProfileMenuOpen((open) => !open);
  }, []);

  const onMenuClick = useCallback(() => {
    setSavedPanelOpen(false);
    setProfileMenuOpen(false);
    setMenuOpen((open) => !open);
  }, []);

  const openSavedFromMenu = useCallback(() => {
    setMenuOpen(false);
    setProfileMenuOpen(false);
    setSavedPanelOpen(true);
  }, []);

  return {
    menuOpen,
    savedPanelOpen,
    profileMenuOpen,
    anyPanelOpen,
    closeAll,
    closeMenu,
    closeSavedPanel,
    closeProfileMenu,
    onLogoClick,
    onSavedClick,
    onProfileClick,
    onMenuClick,
    openSavedFromMenu,
  };
}

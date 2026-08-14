"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { LocationSelectorPanel } from "@/components/location/LocationSelectorPanel";
import { cn } from "@/lib/utils";
import { MENU_EASE } from "@/lib/navigation";
import { skipLocationPrompt } from "@/lib/user-location-store";
import {
  hasPersonalizationLocation,
  hasSkippedLocationPrompt,
} from "@/lib/user-location-storage";

interface LocationSelectorDropdownProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}

export function LocationSelectorDropdown({
  open,
  anchorRef,
  onClose,
}: LocationSelectorDropdownProps) {
  const panelId = useId();
  const titleId = `${panelId}-title`;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const isTypingInPanel = useCallback(() => {
    if (typeof document === "undefined") return false;
    const active = document.activeElement;
    return Boolean(active && panelRef.current?.contains(active));
  }, []);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => setVisible(false));
      return;
    }
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const handleDismiss = useCallback(() => {
    if (
      !hasPersonalizationLocation() &&
      !hasSkippedLocationPrompt()
    ) {
      skipLocationPrompt();
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("location-selector-open");
    document.documentElement.classList.add("location-selector-open");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleDismiss();
    }

    function onDocumentClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      handleDismiss();
    }

    /**
     * Do not dismiss on scroll while typing ZIP — iOS Safari scrolls/resizes
     * the visual viewport when the keyboard opens, which was closing this
     * panel mid-keystroke and contributing to force-quits.
     */
    function onPageScroll() {
      if (isTypingInPanel()) return;
      handleDismiss();
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("scroll", onPageScroll, { passive: true });
    return () => {
      document.body.classList.remove("location-selector-open");
      document.documentElement.classList.remove("location-selector-open");
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("scroll", onPageScroll);
      /* iOS keyboard can leave the page scrolled — snap map shell back */
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
  }, [open, handleDismiss, anchorRef, isTypingInPanel]);

  const handleUpdated = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open && !visible) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="location-selector-root" role="presentation">
      <div
        className={cn(
          "location-selector-backdrop",
          visible && open && "location-selector-backdrop--visible"
        )}
        aria-hidden
      />

      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        className={cn(
          "location-selector-dropdown glass-panel",
          visible && open && "location-selector-dropdown--visible"
        )}
        style={{
          transitionTimingFunction: MENU_EASE,
        }}
      >
        <div className="location-selector-dropdown__glow" aria-hidden />
        <div className="location-selector-dropdown__scroll">
          <LocationSelectorPanel onUpdated={handleUpdated} />
        </div>
      </div>
    </div>,
    document.body
  );
}

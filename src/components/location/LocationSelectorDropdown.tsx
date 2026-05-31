"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
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

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  bottom: number;
}

interface LocationSelectorDropdownProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}

function measureAnchor(el: HTMLElement | null): AnchorRect | null {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    bottom: rect.bottom,
  };
}

function computePanelStyle(
  anchor: AnchorRect,
  panelWidth: number
): { top: number; left: number; width: number } {
  const margin = 16;
  const gap = 10;
  const maxWidth = Math.min(360, window.innerWidth - margin * 2);
  const width = Math.min(panelWidth, maxWidth);
  const anchorRight = anchor.left + anchor.width;
  const preferRightAlign =
    anchor.left + anchor.width / 2 > window.innerWidth * 0.52;
  let left = preferRightAlign
    ? anchorRight - width
    : anchor.left + anchor.width / 2 - width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
  const top = anchor.bottom + gap;
  return { top, left, width };
}

export function LocationSelectorDropdown({
  open,
  anchorRef,
  onClose,
}: LocationSelectorDropdownProps) {
  const panelId = useId();
  const titleId = `${panelId}-title`;
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [visible, setVisible] = useState(false);

  const updateAnchor = useCallback(() => {
    setAnchorRect(measureAnchor(anchorRef.current));
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    updateAnchor();
    const onLayout = () => updateAnchor();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open, updateAnchor]);

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

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("location-selector-open");
      document.documentElement.classList.remove("location-selector-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleDismiss]);

  const handleUpdated = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open && !visible) return null;
  if (typeof document === "undefined") return null;

  const panelStyle =
    anchorRect && typeof window !== "undefined"
      ? computePanelStyle(anchorRect, Math.max(anchorRect.width, 300))
      : {
          top: 72,
          left: 16,
          width: Math.min(360, window.innerWidth - 32),
        };

  return createPortal(
    <div className="location-selector-root" role="presentation">
      <button
        type="button"
        className={cn(
          "location-selector-backdrop smoac-control",
          visible && open && "location-selector-backdrop--visible"
        )}
        aria-label="Close location selector"
        onClick={handleDismiss}
      />

      <div
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "location-selector-dropdown glass-panel",
          visible && open && "location-selector-dropdown--visible"
        )}
        style={{
          top: panelStyle.top,
          left: panelStyle.left,
          width: panelStyle.width,
          transitionTimingFunction: MENU_EASE,
        }}
        onClick={(event) => event.stopPropagation()}
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

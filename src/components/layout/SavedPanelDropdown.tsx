"use client";

import { useId } from "react";
import { SavedPanelContent } from "@/components/saved";
import { useOwnPointerDismiss } from "@/hooks/useFastActivate";
import { cn } from "@/lib/utils";
import { MENU_EASE } from "@/lib/navigation";

interface SavedPanelDropdownProps {
  open: boolean;
  onClose: () => void;
}

export function SavedPanelDropdown({ open, onClose }: SavedPanelDropdownProps) {
  const panelId = useId();
  const titleId = `${panelId}-title`;
  const backdropDismiss = useOwnPointerDismiss(onClose);

  return (
    <div
      data-header-overlay-panel="saved"
      className="saved-dropdown absolute inset-0"
      aria-hidden={false}
    >
      <button
        type="button"
        aria-label="Close saved specialists"
        onPointerDown={backdropDismiss.onPointerDown}
        onPointerUp={backdropDismiss.onPointerUp}
        onClick={backdropDismiss.onClick}
        className={cn(
          "smoac-control saved-dropdown__backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-500",
          open ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionTimingFunction: MENU_EASE }}
      />

      <div
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "saved-dropdown__panel",
          "transition-[opacity,transform] duration-500 will-change-transform",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-4 opacity-0"
        )}
        style={{ transitionTimingFunction: MENU_EASE }}
      >
        <div className="saved-dropdown__glow" aria-hidden />
        <div className="saved-dropdown__scroll">
          <SavedPanelContent
            variant="overlay"
            titleId={titleId}
            onAuthNavigate={onClose}
          />
        </div>
      </div>
    </div>
  );
}

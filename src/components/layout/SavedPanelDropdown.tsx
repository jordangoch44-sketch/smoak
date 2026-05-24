"use client";

import { SavedPanelContent } from "@/components/saved";
import { cn } from "@/lib/utils";
import { MENU_EASE } from "@/lib/navigation";

interface SavedPanelDropdownProps {
  open: boolean;
  onClose: () => void;
}

export function SavedPanelDropdown({ open, onClose }: SavedPanelDropdownProps) {
  return (
    <div
      className={cn(
        "saved-dropdown fixed inset-0 z-40",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close saved specialists"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-500",
          open ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionTimingFunction: MENU_EASE }}
      />

      <div
        id="saved-panel-dropdown"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-panel-title"
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
          <SavedPanelContent variant="overlay" />
        </div>
      </div>
    </div>
  );
}

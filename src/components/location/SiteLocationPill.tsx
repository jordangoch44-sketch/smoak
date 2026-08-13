"use client";

import { useRef } from "react";
import { LocationMarkIcon } from "@/components/ui/icons";
import { useUserLocationEditor } from "@/contexts/UserLocationContext";
import { useUserLocation } from "@/hooks/useUserLocation";
import { cn } from "@/lib/utils";

interface SiteLocationPillProps {
  className?: string;
  /** Slightly smaller type on mobile utility bar */
  compact?: boolean;
  /** Homepage gate anchors to the mobile header control */
  primary?: boolean;
}

const PLACEHOLDER_LABEL = "Enter ZIP";

export function SiteLocationPill({
  className,
  compact = false,
  primary = false,
}: SiteLocationPillProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { zip, isPlaceholder, isPanelOpen } = useUserLocation();
  const { toggleLocationPanel, panelAnchorRef } = useUserLocationEditor();

  const handleClick = () => {
    if (buttonRef.current) {
      panelAnchorRef.current = buttonRef.current;
    }
    toggleLocationPanel(buttonRef.current);
  };

  const zipLabel = zip?.trim() || PLACEHOLDER_LABEL;

  return (
    <button
      ref={buttonRef}
      type="button"
      data-location-pill={primary ? "primary" : undefined}
      {...(primary ? { "data-location-pill-primary": true } : {})}
      className={cn(
        "site-location-text smoac-control",
        compact && "site-location-text--compact",
        isPlaceholder && "site-location-text--placeholder",
        isPanelOpen && "site-location-text--open",
        className
      )}
      onClick={handleClick}
      aria-expanded={isPanelOpen}
      aria-haspopup="dialog"
      aria-label={
        isPlaceholder
          ? "Set your location for local results"
          : `Location ZIP ${zipLabel}. Tap to change`
      }
    >
      <LocationMarkIcon className="site-location-text__icon" aria-hidden />
      <span className="site-location-text__copy">
        {isPlaceholder ? (
          <span className="site-location-text__placeholder">
            {PLACEHOLDER_LABEL}
          </span>
        ) : (
          <span className="site-location-text__zip">{zipLabel}</span>
        )}
      </span>
    </button>
  );
}

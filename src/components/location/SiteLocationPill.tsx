"use client";

import { useRef } from "react";
import { LocationMarkIcon } from "@/components/ui/icons";
import { useUserLocationEditor } from "@/contexts/UserLocationContext";
import { UNKNOWN_ZIP_AREA_LABEL } from "@/lib/geo/zip-place-names";
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

function getAriaLocationLabel(
  city: string | null,
  zip: string | null,
  isPlaceholder: boolean
): string {
  if (isPlaceholder) return PLACEHOLDER_LABEL;
  if (city && zip) return `${city}, ${zip}`;
  return city ?? zip ?? PLACEHOLDER_LABEL;
}

export function SiteLocationPill({
  className,
  compact = false,
  primary = false,
}: SiteLocationPillProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { zip, city, isPlaceholder, isUnknownArea, isPanelOpen } =
    useUserLocation();
  const { toggleLocationPanel, panelAnchorRef } = useUserLocationEditor();

  const handleClick = () => {
    if (buttonRef.current) {
      panelAnchorRef.current = buttonRef.current;
    }
    toggleLocationPanel(buttonRef.current);
  };

  const hasCity = Boolean(city?.trim());
  const hasZip = Boolean(zip?.trim());
  const showFull = hasCity && hasZip;

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
          : `Location: ${getAriaLocationLabel(city, zip, isPlaceholder)}. Tap to change`
      }
    >
      <LocationMarkIcon className="site-location-text__icon" aria-hidden />
      <span className="site-location-text__copy">
        {isPlaceholder ? (
          <span className="site-location-text__placeholder">{PLACEHOLDER_LABEL}</span>
        ) : showFull ? (
          <>
            <span className="site-location-text__city">{city}</span>
            <span className="site-location-text__sep" aria-hidden>
              {" "}
              ·{" "}
            </span>
            <span className="site-location-text__zip">{zip}</span>
          </>
        ) : isUnknownArea && hasZip ? (
          <>
            <span className="site-location-text__city site-location-text__city--muted">
              {UNKNOWN_ZIP_AREA_LABEL}
            </span>
            <span className="site-location-text__sep" aria-hidden>
              {" "}
              ·{" "}
            </span>
            <span className="site-location-text__zip">{zip}</span>
          </>
        ) : hasCity ? (
          <span className="site-location-text__city">{city}</span>
        ) : (
          <span className="site-location-text__zip">{zip}</span>
        )}
      </span>
    </button>
  );
}

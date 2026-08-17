"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { LocationSelectorPanel } from "@/components/location/LocationSelectorPanel";
import { Logo } from "@/components/ui/Logo";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useHydrated } from "@/hooks/useHydrated";
import { getProfileZipFromSession } from "@/lib/client-profile-location";
import { isExploreNavPath } from "@/lib/mobile-bottom-nav";
import { skipLocationPrompt } from "@/lib/user-location-store";
import {
  needsSiteLocationGate,
  USER_LOCATION_CHANGE_EVENT,
} from "@/lib/user-location-storage";

function subscribeLocationChange(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onStoreChange();
  window.addEventListener(USER_LOCATION_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(USER_LOCATION_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function readNeedsLocationGate(): boolean {
  return needsSiteLocationGate();
}

/**
 * Optional Search-page location popup (ZIP + precise GPS).
 * Marketplace is never gated. Dismiss → IP frames the map.
 */
export function SiteLocationGate() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const titleId = useId();
  const { session } = useAuthSession();
  const [dismissed, setDismissed] = useState(false);
  const needsLocation = useSyncExternalStore(
    subscribeLocationChange,
    readNeedsLocationGate,
    () => false
  );

  const profileHasZip = Boolean(getProfileZipFromSession(session));
  const shouldShow =
    hydrated &&
    !dismissed &&
    isExploreNavPath(pathname) &&
    needsLocation &&
    !profileHasZip;

  const handleUpdated = useCallback(() => {
    if (!needsSiteLocationGate()) {
      setDismissed(true);
    }
  }, []);

  const handleSkip = useCallback(() => {
    skipLocationPrompt();
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (!shouldShow) return;
    document.body.classList.add("site-location-gate-open");
    document.documentElement.classList.add("site-location-gate-open");
    return () => {
      document.body.classList.remove("site-location-gate-open");
      document.documentElement.classList.remove("site-location-gate-open");
    };
  }, [shouldShow]);

  useEffect(() => {
    if (profileHasZip || !needsLocation) {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, [profileHasZip, needsLocation]);

  useEffect(() => {
    if (!shouldShow) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleSkip();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shouldShow, handleSkip]);

  if (!shouldShow) return null;

  return createPortal(
    <div
      className="site-location-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleSkip}
    >
      <div className="site-location-gate__glow" aria-hidden />
      <div
        className="site-location-gate__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="site-location-gate__brand">
          <Logo href={null} size="lg" className="site-location-gate__logo" />
          <p id={titleId} className="sr-only">
            Set a location for closer Search results, or continue nearby
          </p>
        </div>
        <LocationSelectorPanel
          mode="gate"
          onUpdated={handleUpdated}
          onSkip={handleSkip}
        />
      </div>
    </div>,
    document.body
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { LocationSelectorPanel } from "@/components/location/LocationSelectorPanel";
import { Logo } from "@/components/ui/Logo";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useHydrated } from "@/hooks/useHydrated";
import { getProfileZipFromSession } from "@/lib/client-profile-location";
import { hasSeenSiteIntro, subscribeSiteIntroChange } from "@/lib/site-intro-storage";
import {
  needsSiteLocationGate,
  USER_LOCATION_CHANGE_EVENT,
} from "@/lib/user-location-storage";

const GATE_EXCLUDED_PREFIXES = [
  "/login",
  "/create-account",
  "/specialist-dashboard",
  "/client-dashboard",
  "/admin",
  "/specialist-apply",
  "/apply",
  "/tap-test",
] as const;

function isLocationGateRoute(pathname: string): boolean {
  return !GATE_EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

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
 * Required location gate after the welcome warp (and on later visits without
 * a saved ZIP/geo). Header ZIP remains available to adjust later.
 */
export function SiteLocationGate() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const titleId = useId();
  const { session } = useAuthSession();
  const [dismissed, setDismissed] = useState(false);
  const introSeen = useSyncExternalStore(
    subscribeSiteIntroChange,
    hasSeenSiteIntro,
    () => true
  );
  const needsLocation = useSyncExternalStore(
    subscribeLocationChange,
    readNeedsLocationGate,
    () => false
  );

  const profileHasZip = Boolean(getProfileZipFromSession(session));
  const introBlocking =
    pathname === "/" && !introSeen;
  const shouldShow =
    hydrated &&
    !dismissed &&
    !introBlocking &&
    isLocationGateRoute(pathname) &&
    needsLocation &&
    !profileHasZip;

  const handleUpdated = useCallback(() => {
    if (!needsSiteLocationGate()) {
      setDismissed(true);
    }
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

  if (!shouldShow) return null;

  return createPortal(
    <div
      className="site-location-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="site-location-gate__glow" aria-hidden />
      <div className="site-location-gate__panel">
        <div className="site-location-gate__brand">
          <Logo href={null} size="lg" className="site-location-gate__logo" />
          <p id={titleId} className="sr-only">
            Welcome to SMOAC — set your location to continue
          </p>
        </div>
        <LocationSelectorPanel mode="gate" onUpdated={handleUpdated} />
      </div>
    </div>,
    document.body
  );
}

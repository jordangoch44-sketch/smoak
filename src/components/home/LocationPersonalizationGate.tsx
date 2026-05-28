"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { LocationPersonalizationModal } from "@/components/home/LocationPersonalizationModal";
import { useHydrated } from "@/hooks/useHydrated";
import { scheduleAfterFirstPaint } from "@/lib/schedule-after-paint";
import { hasSeenSiteIntro } from "@/lib/site-intro-storage";
import {
  getShouldShowLocationPromptServerSnapshot,
  getShouldShowLocationPromptSnapshot,
  subscribeUserLocation,
} from "@/lib/user-location-store";

function subscribeSiteIntro(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onStoreChange();
  window.addEventListener("smoac-site-intro-change", handler);
  return () => window.removeEventListener("smoac-site-intro-change", handler);
}

function getSiteIntroSeenForLocationSnapshot(): boolean {
  return hasSeenSiteIntro();
}

/**
 * Homepage location prompt — shown once until geo, ZIP, or skip is saved.
 * Waits for the site welcome intro so overlays do not stack.
 */
export function LocationPersonalizationGate() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);

  const introSeen = useSyncExternalStore(
    subscribeSiteIntro,
    getSiteIntroSeenForLocationSnapshot,
    () => true
  );

  const shouldPrompt = useSyncExternalStore(
    subscribeUserLocation,
    getShouldShowLocationPromptSnapshot,
    getShouldShowLocationPromptServerSnapshot
  );

  const eligible =
    hydrated && pathname === "/" && introSeen && shouldPrompt;

  if (!eligible && open) {
    setOpen(false);
  }

  useEffect(() => {
    if (!eligible) return;
    return scheduleAfterFirstPaint(() => setOpen(true));
  }, [eligible]);

  const isOpen = eligible && open;

  const handleClose = () => {
    setOpen(false);
  };

  if (!hydrated || pathname !== "/") {
    return null;
  }

  return (
    <LocationPersonalizationModal open={isOpen} onClose={handleClose} />
  );
}

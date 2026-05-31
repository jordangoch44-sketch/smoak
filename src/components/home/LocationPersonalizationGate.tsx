"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useUserLocationEditor } from "@/contexts/UserLocationContext";
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
 * Homepage first-visit location — opens the header dropdown (not a modal).
 */
export function LocationPersonalizationGate() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { openLocationPanel, closeLocationPanel } = useUserLocationEditor();

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

  useEffect(() => {
    if (pathname !== "/") {
      closeLocationPanel();
    }
  }, [pathname, closeLocationPanel]);

  useEffect(() => {
    if (!eligible) return;
    return scheduleAfterFirstPaint(() => openLocationPanel());
  }, [eligible, openLocationPanel]);

  return null;
}

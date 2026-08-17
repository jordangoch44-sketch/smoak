"use client";

import { useSyncExternalStore } from "react";

function subscribeBodyClass(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function bodyHasClass(className: string): boolean {
  if (typeof document === "undefined") return false;
  return document.body.classList.contains(className);
}

function useBodyClass(className: string): boolean {
  return useSyncExternalStore(
    subscribeBodyClass,
    () => bodyHasClass(className),
    () => false
  );
}

/** True while soft-nav profile sheet chrome is locked open. */
export function useProfileSheetOpen(): boolean {
  return useBodyClass("profile-sheet-open");
}

/** True while the Search location popup covers Explore (Leaflet must wait). */
export function useSiteLocationGateOpen(): boolean {
  return useBodyClass("site-location-gate-open");
}

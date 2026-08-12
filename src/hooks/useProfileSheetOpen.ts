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

/** True while soft-nav profile sheet chrome is locked open. */
export function useProfileSheetOpen(): boolean {
  return useSyncExternalStore(
    subscribeBodyClass,
    () => bodyHasClass("profile-sheet-open"),
    () => false
  );
}

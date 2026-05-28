"use client";

import { useSyncExternalStore } from "react";

function subscribeHydrated(): () => void {
  return () => {};
}

function getHydratedSnapshot(): boolean {
  return true;
}

function getHydratedServerSnapshot(): boolean {
  return false;
}

/** True after mount — use to gate client-only UI and avoid hydration mismatches. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydrated,
    getHydratedSnapshot,
    getHydratedServerSnapshot
  );
}

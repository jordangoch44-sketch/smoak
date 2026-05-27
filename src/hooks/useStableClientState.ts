"use client";

import { useHydrated } from "@/hooks/useHydrated";

/**
 * Gate client-only UI (auth badges, saved counts, premium flags) until after mount
 * so the header shell HTML matches server render.
 */
export function useStableClientState() {
  const hydrated = useHydrated();
  return { hydrated, clientReady: hydrated };
}

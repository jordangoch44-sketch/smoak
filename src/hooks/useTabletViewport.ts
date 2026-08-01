"use client";

import { useSyncExternalStore } from "react";
import {
  getTabletMaxWidthSnapshot,
  subscribeTabletMaxWidth,
} from "@/lib/viewport";

/** Mobile + tablet — bottom nav visible below `lg` (1024px). Assume true on SSR so phones don't hydrate into the desktop blur path. */
export function useTabletViewport(serverSnapshot = true): boolean {
  return useSyncExternalStore(
    subscribeTabletMaxWidth,
    getTabletMaxWidthSnapshot,
    () => serverSnapshot
  );
}

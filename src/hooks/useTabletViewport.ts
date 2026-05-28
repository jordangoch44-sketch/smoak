"use client";

import { useSyncExternalStore } from "react";
import {
  getTabletMaxWidthSnapshot,
  subscribeTabletMaxWidth,
} from "@/lib/viewport";

/** Mobile + tablet — bottom nav visible below `lg` (1024px) */
export function useTabletViewport(serverSnapshot = false): boolean {
  return useSyncExternalStore(
    subscribeTabletMaxWidth,
    getTabletMaxWidthSnapshot,
    () => serverSnapshot
  );
}

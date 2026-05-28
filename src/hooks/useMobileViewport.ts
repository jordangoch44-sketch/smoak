"use client";

import { useSyncExternalStore } from "react";
import {
  getMobileMaxWidthSnapshot,
  subscribeMobileMaxWidth,
} from "@/lib/viewport";

/** Phone — matches Tailwind `md` breakpoint (768px) */
export function useMobileViewport(serverSnapshot = true): boolean {
  return useSyncExternalStore(
    subscribeMobileMaxWidth,
    getMobileMaxWidthSnapshot,
    () => serverSnapshot
  );
}

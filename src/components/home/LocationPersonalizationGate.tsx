"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useUserLocationEditor } from "@/contexts/UserLocationContext";

/**
 * Closes the location dropdown when leaving the homepage.
 * (No longer auto-opens on first visit — that blocked mid-page scroll.)
 */
export function LocationPersonalizationGate() {
  const pathname = usePathname();
  const { closeLocationPanel } = useUserLocationEditor();

  useEffect(() => {
    if (pathname !== "/") {
      closeLocationPanel();
    }
  }, [pathname, closeLocationPanel]);

  return null;
}

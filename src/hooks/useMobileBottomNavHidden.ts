"use client";

import { useEffect, useState } from "react";
import { isChromeBodyOverlayActive } from "@/lib/chrome-body-classes";

/** Hide floating bottom nav when a modal or header overlay is open. */
export function useMobileBottomNavHidden(): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    function recompute() {
      setHidden(isChromeBodyOverlayActive());
    }

    recompute();

    const observer = new MutationObserver(recompute);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return hidden;
}

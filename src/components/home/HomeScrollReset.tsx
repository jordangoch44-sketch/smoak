"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  forceDocumentScrollTop,
  pinDocumentScrollTop,
} from "@/lib/mobile-chrome";

/**
 * Marketplace homepage must paint at the top. Browser scroll restoration and
 * late layout (rails hydrating) can otherwise leave the first view mid-page.
 */
export function HomeScrollReset() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname !== "/") return;
    try {
      history.scrollRestoration = "manual";
    } catch {
      /* ignore */
    }
    forceDocumentScrollTop();
    pinDocumentScrollTop(350);
  }, [pathname]);

  return null;
}

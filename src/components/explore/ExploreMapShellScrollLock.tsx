"use client";

import { useLayoutEffect } from "react";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import {
  armExploreMapShellScrollLock,
  disarmExploreMapShellScrollLock,
  forceDocumentScrollTop,
  pinDocumentScrollTop,
} from "@/lib/mobile-chrome";

/**
 * Runs under the explore layout (including `loading.tsx`) so scroll is pinned
 * before paint — not only after ExplorePageClient hydrates.
 */
export function ExploreMapShellScrollLock() {
  const isMobile = useMobileViewport(true);

  useLayoutEffect(() => {
    if (!isMobile) return;

    let previousRestoration: ScrollRestoration | null = null;
    try {
      previousRestoration = history.scrollRestoration;
      history.scrollRestoration = "manual";
    } catch {
      /* ignore */
    }

    armExploreMapShellScrollLock();
    /* Timeouts in pinDocumentScrollTop cover re-apply; scroll listener catches late iOS restores. */
    pinDocumentScrollTop(1800);

    const onScroll = () => {
      if (window.scrollY !== 0 || document.documentElement.scrollTop !== 0) {
        forceDocumentScrollTop();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      disarmExploreMapShellScrollLock();
      if (previousRestoration != null) {
        try {
          history.scrollRestoration = previousRestoration;
        } catch {
          /* ignore */
        }
      }
    };
  }, [isMobile]);

  return null;
}

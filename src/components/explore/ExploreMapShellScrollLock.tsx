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
    let previousRestoration: ScrollRestoration | null = null;

    if (isMobile) {
      try {
        previousRestoration = history.scrollRestoration;
        history.scrollRestoration = "manual";
      } catch {
        /* ignore */
      }

      armExploreMapShellScrollLock();
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
    }

    /* Desktop: never arm — but always disarm when leaving Search (nav pill arms early). */
    return () => {
      disarmExploreMapShellScrollLock();
    };
  }, [isMobile]);

  return null;
}

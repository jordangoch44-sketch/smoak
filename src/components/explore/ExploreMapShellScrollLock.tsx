"use client";

import { useLayoutEffect } from "react";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import {
  forceDocumentScrollTop,
  pinDocumentScrollTop,
} from "@/lib/mobile-chrome";

const MAP_SHELL_BODY_CLASS = "explore-map-shell-open";

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

    forceDocumentScrollTop();
    document.body.classList.add(MAP_SHELL_BODY_CLASS);
    document.documentElement.classList.add(MAP_SHELL_BODY_CLASS);
    forceDocumentScrollTop();
    pinDocumentScrollTop(900);

    const onScroll = () => {
      if (window.scrollY !== 0 || document.documentElement.scrollTop !== 0) {
        forceDocumentScrollTop();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const until = Date.now() + 900;
    const intervalId = window.setInterval(() => {
      if (window.scrollY !== 0 || document.documentElement.scrollTop !== 0) {
        forceDocumentScrollTop();
      }
      if (Date.now() >= until) window.clearInterval(intervalId);
    }, 32);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearInterval(intervalId);
      document.body.classList.remove(MAP_SHELL_BODY_CLASS);
      document.documentElement.classList.remove(MAP_SHELL_BODY_CLASS);
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

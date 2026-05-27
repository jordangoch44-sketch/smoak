"use client";

import { useEffect } from "react";

const SCROLL_THRESHOLD_PX = 12;

/** Toggles `data-scrolled` on #site-header for mobile glass fade (passive, no layout shift). */
export function useSiteHeaderScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const header = document.getElementById("site-header");
    if (!header) return;

    let ticking = false;

    function update() {
      ticking = false;
      const scrolled = window.scrollY > SCROLL_THRESHOLD_PX;
      header!.setAttribute("data-scrolled", scrolled ? "true" : "false");
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      header.removeAttribute("data-scrolled");
    };
  }, [enabled]);
}

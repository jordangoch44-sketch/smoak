"use client";

import { useEffect } from "react";

const MIN_VISIBLE_MS = 700;
const MAX_VISIBLE_MS = 12_000;
const ZOOM_MS = 720;

function marketplaceReady() {
  const hero = document.querySelector(".home-hero--discovery");
  if (!(hero instanceof HTMLElement)) return false;
  const box = hero.getBoundingClientRect();
  return box.height > 80 && box.width > 80;
}

/**
 * Holds the opening S until Marketplace has actually painted, then zooms it
 * off. Other cold-start routes clear once their page has height.
 */
export function AppBootSplashController() {
  useEffect(() => {
    const splash = document.getElementById("app-boot-splash");
    if (!splash) return;
    if (!document.documentElement.classList.contains("native-app")) {
      splash.remove();
      return;
    }

    let finished = false;
    const started = performance.now();

    const finish = () => {
      if (finished) return;
      finished = true;
      splash.classList.add("is-zoom");
      splash.setAttribute("aria-busy", "false");
      window.setTimeout(() => splash.remove(), ZOOM_MS);
    };

    const tick = () => {
      if (finished) return;
      const elapsed = performance.now() - started;
      const onHome = window.location.pathname === "/";
      const page = document.querySelector(".app-main");
      const pageReady =
        !onHome &&
        page instanceof HTMLElement &&
        page.getBoundingClientRect().height > 120;
      if (elapsed >= MAX_VISIBLE_MS || (elapsed >= MIN_VISIBLE_MS && (marketplaceReady() || pageReady))) {
        finish();
        return;
      }
      window.requestAnimationFrame(tick);
    };

    const frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return null;
}

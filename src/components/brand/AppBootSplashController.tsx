"use client";

import { useLayoutEffect, useRef } from "react";

/** Matches the 1.7s `.smoac-loader` cycle in smoac-loader.css. */
const DRAW_CYCLE_MS = 1700;
const MIN_DRAW_CYCLES = 2;
const MIN_VISIBLE_MS = DRAW_CYCLE_MS * MIN_DRAW_CYCLES;
const MAX_VISIBLE_MS = 12_000;
const ZOOM_MS = 720;

function isNativeCapacitor(): boolean {
  const capacitor = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  return Boolean(
    capacitor &&
      typeof capacitor.isNativePlatform === "function" &&
      capacitor.isNativePlatform()
  );
}

function bootStartedAt(): number {
  const parsed = Number(document.documentElement.dataset.smoacBoot);
  return Number.isFinite(parsed) ? parsed : performance.now();
}

function fontsReady(): boolean {
  return !document.fonts || document.fonts.status === "loaded";
}

function marketplaceReady(): boolean {
  const hero = document.querySelector(".home-hero--discovery");
  if (!(hero instanceof HTMLElement)) return false;
  const box = hero.getBoundingClientRect();
  if (box.height <= 80 || box.width <= 80) return false;
  if (document.querySelector(".home-page--discovery .home-route-loading")) {
    return false;
  }

  const images = document.querySelectorAll(
    ".home-page--discovery .home-portrait-card img"
  );
  for (const node of images) {
    if (!(node instanceof HTMLImageElement)) continue;
    if (node.loading === "lazy") continue;
    if (!node.complete) return false;
  }

  return fontsReady();
}

function otherRouteReady(): boolean {
  const page = document.querySelector(".app-main");
  return (
    page instanceof HTMLElement &&
    page.getBoundingClientRect().height > 120 &&
    fontsReady()
  );
}

/**
 * Holds the opening S for two full draws, and longer if Marketplace (or
 * another cold-start route) is still loading. Then zooms it off.
 * The splash node stays under React — removing it directly makes Safari
 * throw NotFoundError on the next insertBefore / removeChild.
 */
export function AppBootSplashController({
  onZoom,
  onDone,
}: {
  onZoom: () => void;
  onDone: () => void;
}) {
  const onZoomRef = useRef(onZoom);
  const onDoneRef = useRef(onDone);
  onZoomRef.current = onZoom;
  onDoneRef.current = onDone;

  useLayoutEffect(() => {
    if (isNativeCapacitor()) {
      document.documentElement.classList.add("native-app");
    }
    if (!document.documentElement.classList.contains("native-app")) {
      onDoneRef.current();
      return;
    }

    let finished = false;
    let frame = 0;
    let zoomTimer = 0;
    const started = bootStartedAt();

    const finish = () => {
      if (finished) return;
      finished = true;
      onZoomRef.current();
      zoomTimer = window.setTimeout(() => onDoneRef.current(), ZOOM_MS);
    };

    const tick = () => {
      if (finished) return;
      const elapsed = performance.now() - started;
      const onHome = window.location.pathname === "/";
      const contentReady = onHome ? marketplaceReady() : otherRouteReady();
      if (
        elapsed >= MAX_VISIBLE_MS ||
        (elapsed >= MIN_VISIBLE_MS && contentReady)
      ) {
        finish();
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(zoomTimer);
    };
  }, []);

  return null;
}

"use client";

import { useCallback, useRef, type MouseEvent, type PointerEvent } from "react";
import { isModifiedNavActivation } from "@/lib/mobile-bottom-nav-transition";

/** Finger travel that still counts as a tap. Scrolls over large tiles exceed this. */
export const TAP_SLOP_PX = 12;
/** Pinned photos / cover-sized media — a short sheet scroll stays inside the tile. */
export const MEDIA_TAP_SLOP_PX = 22;

function movedPastSlop(
  origin: { x: number; y: number } | null,
  event: { clientX: number; clientY: number },
  slopPx: number
): boolean {
  if (!origin) return false;
  return Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > slopPx;
}

/**
 * Buttons / overlay openers: touch commits on pointerup so a busy main thread
 * cannot drop the later click. Mouse still uses click so drag-off cancels.
 * Touch that travels past slop is treated as a scroll, not a tap.
 */
export function useFastActivate(
  activate: () => void,
  options?: { stopPropagation?: boolean; slopPx?: number }
): {
  onPointerDown: (event: PointerEvent<Element>) => void;
  onPointerCancel: () => void;
  onPointerUp: (event: PointerEvent<Element>) => void;
  onClick: (event: MouseEvent<Element>) => void;
} {
  const activateRef = useRef(activate);
  activateRef.current = activate;
  const openedByPointerRef = useRef(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const stopPropagation = Boolean(options?.stopPropagation);
  const slopPx = options?.slopPx ?? TAP_SLOP_PX;

  const onPointerDown = useCallback((event: PointerEvent<Element>) => {
    if (stopPropagation) event.stopPropagation();
    if (event.button !== 0) return;
    originRef.current = { x: event.clientX, y: event.clientY };
  }, [stopPropagation]);

  const onPointerCancel = useCallback(() => {
    originRef.current = null;
  }, []);

  const onPointerUp = useCallback((event: PointerEvent<Element>) => {
    if (stopPropagation) event.stopPropagation();
    if (event.pointerType === "mouse") return;
    if (isModifiedNavActivation(event)) return;
    const origin = originRef.current;
    originRef.current = null;
    /* Swallow the trailing click whether this was a tap or a scroll. */
    openedByPointerRef.current = true;
    if (movedPastSlop(origin, event, slopPx)) return;
    activateRef.current();
  }, [slopPx, stopPropagation]);

  const onClick = useCallback((event: MouseEvent<Element>) => {
    if (stopPropagation) event.stopPropagation();
    if (openedByPointerRef.current) {
      event.preventDefault();
      openedByPointerRef.current = false;
      return;
    }
    activateRef.current();
  }, [stopPropagation]);

  return { onPointerDown, onPointerCancel, onPointerUp, onClick };
}

/**
 * Overlay / drawer backdrops: ignore the leftover click from the opener’s
 * pointerup so the new layer does not immediately dismiss itself.
 * Touch dismisses on pointerup; mouse keeps click so drag-off can cancel.
 */
export function useOwnPointerDismiss(dismiss: () => void): {
  onPointerDown: (event: PointerEvent<Element>) => void;
  onPointerUp: (event: PointerEvent<Element>) => void;
  onClick: () => void;
} {
  const armedRef = useRef(false);
  const openedByPointerRef = useRef(false);
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  const onPointerDown = useCallback((event: PointerEvent<Element>) => {
    if (event.button !== 0) return;
    armedRef.current = true;
  }, []);

  const onPointerUp = useCallback((event: PointerEvent<Element>) => {
    if (event.pointerType === "mouse") return;
    if (!armedRef.current) return;
    armedRef.current = false;
    openedByPointerRef.current = true;
    dismissRef.current();
  }, []);

  const onClick = useCallback(() => {
    if (openedByPointerRef.current) {
      openedByPointerRef.current = false;
      return;
    }
    if (!armedRef.current) return;
    armedRef.current = false;
    dismissRef.current();
  }, []);

  return { onPointerDown, onPointerUp, onClick };
}

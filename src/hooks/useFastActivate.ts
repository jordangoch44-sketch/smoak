"use client";

import { useCallback, useRef, type MouseEvent, type PointerEvent } from "react";
import { isModifiedNavActivation } from "@/lib/mobile-bottom-nav-transition";

/**
 * Buttons / overlay openers: touch commits on pointerup so a busy main thread
 * cannot drop the later click. Mouse still uses click so drag-off cancels.
 */
export function useFastActivate(activate: () => void): {
  onPointerUp: (event: PointerEvent<Element>) => void;
  onClick: (event: MouseEvent<Element>) => void;
} {
  const activateRef = useRef(activate);
  activateRef.current = activate;
  const openedByPointerRef = useRef(false);

  const onPointerUp = useCallback((event: PointerEvent<Element>) => {
    if (event.pointerType === "mouse") return;
    if (isModifiedNavActivation(event)) return;
    openedByPointerRef.current = true;
    activateRef.current();
  }, []);

  const onClick = useCallback((event: MouseEvent<Element>) => {
    if (openedByPointerRef.current) {
      event.preventDefault();
      openedByPointerRef.current = false;
      return;
    }
    activateRef.current();
  }, []);

  return { onPointerUp, onClick };
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

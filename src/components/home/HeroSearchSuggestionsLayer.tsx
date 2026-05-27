"use client";

import { useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { kindLabel, type HeroSearchSuggestion } from "@/lib/hero-search-suggestions";

interface HeroSearchSuggestionsLayerProps {
  open: boolean;
  listboxId: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  resultsPanelRef: React.RefObject<HTMLUListElement | null>;
  layerRef: React.RefObject<HTMLDivElement | null>;
  suggestions: HeroSearchSuggestion[];
  onSelect: (item: HeroSearchSuggestion) => void;
  onDismiss: () => void;
  onPanelInteract?: () => void;
}

const PANEL_GAP_PX = 12;
const VIEWPORT_PAD_PX = 12;
/** One visible suggestion row (matches `.hero-search__suggestion` min-height) */
const SUGGESTION_ROW_PX = 44;
const PANEL_PADDING_PX = 12;
const VISIBLE_SUGGESTION_ROWS = 3;
const THREE_ROW_PANEL_MAX_PX =
  PANEL_PADDING_PX + VISIBLE_SUGGESTION_ROWS * SUGGESTION_ROW_PX;

export function HeroSearchSuggestionsLayer({
  open,
  listboxId,
  anchorRef,
  resultsPanelRef,
  layerRef,
  suggestions,
  onSelect,
  onDismiss,
  onPanelInteract,
}: HeroSearchSuggestionsLayerProps) {
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    function measure() {
      const anchor = anchorRef.current;
      const panel = resultsPanelRef.current;
      if (!anchor || !panel) return;

      const rect = anchor.getBoundingClientRect();
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
      const panelTop = rect.bottom + PANEL_GAP_PX;
      const availableBelow =
        viewportHeight + viewportOffsetTop - panelTop - VIEWPORT_PAD_PX;
      const maxHeight = Math.min(THREE_ROW_PANEL_MAX_PX, availableBelow);

      panel.style.top = `${panelTop}px`;
      panel.style.left = `${rect.left}px`;
      panel.style.width = `${rect.width}px`;
      panel.style.maxHeight = `${maxHeight}px`;
    }

    measure();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", measure);
    window.addEventListener("resize", measure);

    return () => {
      viewport?.removeEventListener("resize", measure);
      window.removeEventListener("resize", measure);
    };
  }, [open, anchorRef, resultsPanelRef, layerRef]);

  useEffect(() => {
    const panel = resultsPanelRef.current;
    if (!open || !panel) return;

    const onPanelTouch = () => onPanelInteract?.();

    const containTouch = (event: TouchEvent) => {
      event.stopPropagation();
    };

    panel.addEventListener("touchstart", onPanelTouch, { passive: true });
    panel.addEventListener("touchmove", onPanelTouch, { passive: true });
    panel.addEventListener("touchstart", containTouch, { passive: true });
    panel.addEventListener("touchmove", containTouch, { passive: true });

    return () => {
      panel.removeEventListener("touchstart", onPanelTouch);
      panel.removeEventListener("touchmove", onPanelTouch);
      panel.removeEventListener("touchstart", containTouch);
      panel.removeEventListener("touchmove", containTouch);
    };
  }, [open, onPanelInteract, resultsPanelRef]);

  if (!open || suggestions.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={layerRef}
      className="hero-search-suggestions-layer"
      role="presentation"
    >
      <button
        type="button"
        className="smoac-control hero-search-suggestions-layer__backdrop"
        aria-label="Dismiss search suggestions"
        tabIndex={-1}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDismiss();
        }}
      />

      <ul
        ref={resultsPanelRef}
        id={listboxId}
        role="listbox"
        className="hero-search-suggestions-layer__panel"
        aria-label="Search suggestions"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {suggestions.map((item) => (
          <li key={item.id} role="presentation">
            <button
              type="button"
              role="option"
              className="smoac-control smoac-tap hero-search__suggestion"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(item)}
            >
              <span className="hero-search__suggestion-text">
                <span className="hero-search__suggestion-label">
                  {item.label}
                </span>
                {item.sublabel ? (
                  <span className="hero-search__suggestion-sublabel">
                    {item.sublabel}
                  </span>
                ) : null}
              </span>
              <span className="hero-search__suggestion-kind">
                {kindLabel(item.kind)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>,
    document.body
  );
}

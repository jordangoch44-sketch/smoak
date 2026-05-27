"use client";

import { useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { kindLabel, type HeroSearchSuggestion } from "@/lib/hero-search-suggestions";

export interface HeroSearchSuggestionsGeometry {
  panelTop: number;
  backdropTop: number;
  left: number;
  width: number;
  maxHeight: number;
}

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

      panel.style.top = `${panelTop}px`;
      panel.style.left = `${rect.left}px`;
      panel.style.width = `${rect.width}px`;
      panel.style.maxHeight = `${Math.max(160, availableBelow)}px`;

      const backdrop = layerRef.current?.querySelector(
        ".hero-search-suggestions-layer__backdrop"
      ) as HTMLElement | null;
      if (backdrop) {
        backdrop.style.top = `${rect.bottom}px`;
      }
    }

    measure();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, anchorRef, resultsPanelRef, layerRef, suggestions.length]);

  useEffect(() => {
    const panel = resultsPanelRef.current;
    if (!open || !panel || !onPanelInteract) return;

    const keepFocus = () => onPanelInteract();
    panel.addEventListener("touchstart", keepFocus, { passive: true });
    panel.addEventListener("touchmove", keepFocus, { passive: true });

    return () => {
      panel.removeEventListener("touchstart", keepFocus);
      panel.removeEventListener("touchmove", keepFocus);
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
        onPointerDown={(e) => e.preventDefault()}
        onClick={onDismiss}
      />

      <ul
        ref={resultsPanelRef}
        id={listboxId}
        role="listbox"
        className="hero-search-suggestions-layer__panel"
        aria-label="Search suggestions"
      >
        {suggestions.map((item) => (
          <li key={item.id} role="presentation">
            <button
              type="button"
              role="option"
              className="smoac-control smoac-tap hero-search__suggestion"
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
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

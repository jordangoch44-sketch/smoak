"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/** Results panel height as % of the map shell */
const RESULTS_HEIGHT_PCT = 88;
/** Drag down this far (px) from open to return to map */
const DISMISS_DRAG_PX = 96;

interface ExploreResultsSheetProps {
  children: ReactNode;
  resultCount: number;
  className?: string;
}

function seeResultsLabel(count: number): string {
  if (count <= 0) return "See results";
  if (count === 1) return "See 1 result";
  return `See ${count} results`;
}

/**
 * Split Search views: map-first + compact “See results” CTA,
 * then a fly-up list panel (majority of the screen).
 */
export function ExploreResultsSheet({
  children,
  resultCount,
  className,
}: ExploreResultsSheetProps) {
  const [open, setOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const titleId = useId();
  const panelRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
  } | null>(null);

  const closeToMap = useCallback(() => {
    setOpen(false);
    setDragOffset(0);
  }, []);

  const openResults = useCallback(() => {
    setOpen(true);
    setDragOffset(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const body = bodyRef.current;
    if (body) body.scrollTop = 0;
  }, [open]);

  const onHandlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!open || event.button !== 0) return;
      event.preventDefault();
      dragRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [open]
  );

  const onHandlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const delta = Math.max(0, event.clientY - drag.startY);
      setDragOffset(delta);
    },
    []
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
      const delta = Math.max(0, event.clientY - drag.startY);
      if (delta >= DISMISS_DRAG_PX) {
        closeToMap();
        return;
      }
      setDragOffset(0);
    },
    [closeToMap]
  );

  return (
    <div
      className={cn(
        "explore-split",
        open && "explore-split--results-open",
        className
      )}
    >
      {!open ? (
        <div className="explore-split__cta-dock">
          <button
            type="button"
            className="smoac-control explore-split__cta"
            onClick={openResults}
          >
            <span className="explore-split__cta-label">
              {seeResultsLabel(resultCount)}
            </span>
            <span className="explore-split__cta-chevron" aria-hidden>
              ⌃
            </span>
          </button>
        </div>
      ) : null}

      <section
        ref={panelRef}
        className={cn(
          "explore-split__panel",
          open && "explore-split__panel--open",
          dragOffset > 0 && "explore-split__panel--dragging"
        )}
        style={
          open
            ? {
                height: `${RESULTS_HEIGHT_PCT}%`,
                transform: dragOffset
                  ? `translateY(${dragOffset}px)`
                  : undefined,
              }
            : undefined
        }
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className="explore-split__chrome">
          <button
            type="button"
            className="smoac-control explore-split__handle-hit"
            aria-label="Drag down to show map"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <span className="explore-split__handle" aria-hidden />
          </button>
          <div className="explore-split__toolbar">
            <h2 id={titleId} className="explore-split__title">
              Results
            </h2>
            <button
              type="button"
              className="smoac-control explore-split__map-btn"
              onClick={closeToMap}
            >
              Map
            </button>
          </div>
        </div>
        <div ref={bodyRef} className="explore-split__body">
          {children}
        </div>
      </section>
    </div>
  );
}

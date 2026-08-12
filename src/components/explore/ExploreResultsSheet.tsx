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
const DISMISS_DRAG_PX = 72;
/** Fast downward flick also dismisses */
const DISMISS_VELOCITY = 0.85;

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
 * then a fly-up list panel. Drag down (chrome or list-at-top) returns to map.
 */
export function ExploreResultsSheet({
  children,
  resultCount,
  className,
}: ExploreResultsSheetProps) {
  const [open, setOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const titleId = useId();
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    lastY: number;
    lastT: number;
    velocity: number;
    active: boolean;
    fromBody: boolean;
  } | null>(null);

  const closeToMap = useCallback(() => {
    dragRef.current = null;
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

  const beginDrag = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      options: { fromBody: boolean; captureTarget: HTMLElement }
    ) => {
      if (!open || event.button !== 0) return;
      if (options.fromBody) {
        const body = bodyRef.current;
        if (!body || body.scrollTop > 1) return;
      }

      dragRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        lastY: event.clientY,
        lastT: performance.now(),
        velocity: 0,
        active: !options.fromBody,
        fromBody: options.fromBody,
      };

      if (!options.fromBody) {
        event.preventDefault();
        options.captureTarget.setPointerCapture(event.pointerId);
      }
    },
    [open]
  );

  const moveDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const now = performance.now();
    const dy = event.clientY - drag.lastY;
    const dt = Math.max(1, now - drag.lastT);
    drag.velocity = dy / dt;
    drag.lastY = event.clientY;
    drag.lastT = now;

    const delta = event.clientY - drag.startY;

    if (drag.fromBody && !drag.active) {
      const body = bodyRef.current;
      if (!body) return;
      /* Only take over once the user pulls down while already at top */
      if (delta <= 8 || body.scrollTop > 1) return;
      drag.active = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    }

    if (!drag.active) return;
    event.preventDefault();
    setDragOffset(Math.max(0, delta));
  }, []);

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const wasActive = drag.active;
      const delta = Math.max(0, event.clientY - drag.startY);
      const velocity = drag.velocity;
      dragRef.current = null;

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }

      if (!wasActive) {
        setDragOffset(0);
        return;
      }

      if (delta >= DISMISS_DRAG_PX || velocity >= DISMISS_VELOCITY) {
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
        className={cn(
          "explore-split__panel",
          open && "explore-split__panel--open",
          dragOffset > 0 && "explore-split__panel--dragging"
        )}
        style={
          open
            ? {
                height: `${RESULTS_HEIGHT_PCT}%`,
                transform: `translateY(${dragOffset}px)`,
              }
            : undefined
        }
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div
          className="explore-split__chrome"
          onPointerDown={(event) => {
            if (
              (event.target as HTMLElement).closest(".explore-split__map-btn")
            ) {
              return;
            }
            beginDrag(event, {
              fromBody: false,
              captureTarget: event.currentTarget,
            });
          }}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="explore-split__handle-hit" aria-hidden>
            <span className="explore-split__handle" />
          </div>
          <div className="explore-split__toolbar">
            <div className="explore-split__toolbar-copy">
              <h2 id={titleId} className="explore-split__title">
                Results
              </h2>
              <p className="explore-split__hint">Drag down for map</p>
            </div>
            <button
              type="button"
              className="smoac-control explore-split__map-btn"
              onClick={closeToMap}
            >
              Map
            </button>
          </div>
        </div>
        <div
          ref={bodyRef}
          className="explore-split__body"
          onPointerDown={(event) =>
            beginDrag(event, {
              fromBody: true,
              captureTarget: event.currentTarget,
            })
          }
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {children}
        </div>
      </section>
    </div>
  );
}

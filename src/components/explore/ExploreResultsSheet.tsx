"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type SheetSnap = "peek" | "mid" | "full";

/** Sheet height as % of the map shell (leaves map visible above) */
const SNAP_HEIGHT: Record<SheetSnap, number> = {
  peek: 32,
  mid: 48,
  full: 78,
};

const SNAP_ORDER: SheetSnap[] = ["peek", "mid", "full"];

function nearestSnap(heightPct: number): SheetSnap {
  let best: SheetSnap = "mid";
  let bestDist = Infinity;
  for (const snap of SNAP_ORDER) {
    const dist = Math.abs(SNAP_HEIGHT[snap] - heightPct);
    if (dist < bestDist) {
      bestDist = dist;
      best = snap;
    }
  }
  return best;
}

interface ExploreResultsSheetProps {
  children: ReactNode;
  className?: string;
}

/**
 * Zillow-style results sheet over the Search map.
 * Handle drag changes snap height; list scrolls inside the sheet only.
 */
export function ExploreResultsSheet({
  children,
  className,
}: ExploreResultsSheetProps) {
  const [snap, setSnap] = useState<SheetSnap>("mid");
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startHeightPct: number;
  } | null>(null);

  const heightPct = dragHeight ?? SNAP_HEIGHT[snap];

  const onHandlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const el = sheetRef.current;
      const parent = el?.parentElement;
      if (!el || !parent) return;

      const parentH = parent.getBoundingClientRect().height || 1;
      const currentPct = (el.getBoundingClientRect().height / parentH) * 100;
      dragRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startHeightPct: currentPct,
      };
      setDragHeight(currentPct);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    []
  );

  const onHandlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const deltaY = drag.startY - event.clientY;
      const parent = sheetRef.current?.parentElement;
      if (!parent) return;
      const parentH = parent.getBoundingClientRect().height || 1;
      const deltaPct = (deltaY / parentH) * 100;
      const next = Math.min(
        SNAP_HEIGHT.full + 4,
        Math.max(SNAP_HEIGHT.peek - 4, drag.startHeightPct + deltaPct)
      );
      setDragHeight(next);
    },
    []
  );

  const endDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    setDragHeight((current) => {
      const pct = current ?? SNAP_HEIGHT.mid;
      setSnap(nearestSnap(pct));
      return null;
    });
  }, []);

  return (
    <section
      ref={sheetRef}
      className={cn(
        "explore-results-sheet",
        dragHeight != null && "explore-results-sheet--dragging",
        className
      )}
      style={{ height: `${heightPct}%` }}
      aria-label="Search results"
    >
      <button
        type="button"
        className="smoac-control explore-results-sheet__handle-hit"
        aria-label="Drag to resize results"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="explore-results-sheet__handle" aria-hidden />
      </button>
      <div className="explore-results-sheet__body">{children}</div>
    </section>
  );
}

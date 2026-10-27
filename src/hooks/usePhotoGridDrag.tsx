"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

interface DragSession {
  url: string;
  active: boolean;
  x: number;
  y: number;
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  started: number;
}

/**
 * Drag a photo tile with the finger and reorder when it lands on another tile.
 * A quick tap is left for the caller. A hold or a move suppresses that tap.
 */
export function usePhotoGridDrag(
  urls: readonly string[],
  enabled: boolean,
  onReorder: (next: string[]) => void,
  previewFor?: (url: string) => string
) {
  const urlsRef = useRef(urls);
  urlsRef.current = urls;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const rowRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingUrl, setDraggingUrl] = useState<string | null>(null);

  function reorder(from: number, to: number) {
    const current = urlsRef.current;
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= current.length ||
      to >= current.length
    ) {
      return;
    }
    const next = current.slice();
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    urlsRef.current = next;
    onReorderRef.current(next);
  }

  function placeGhost(x: number, y: number) {
    const drag = dragRef.current;
    const ghost = ghostRef.current;
    if (!drag || !ghost) return;
    drag.pointerX = x;
    drag.pointerY = y;
    ghost.style.transform = `translate3d(${x - drag.offsetX}px, ${y - drag.offsetY}px, 0)`;
  }

  function attachGhost(node: HTMLDivElement | null) {
    ghostRef.current = node;
    const drag = dragRef.current;
    if (!node || !drag?.active) return;
    node.style.width = `${drag.width}px`;
    node.style.height = `${drag.height}px`;
    placeGhost(drag.pointerX, drag.pointerY);
  }

  function indexAtPoint(x: number, y: number): number | null {
    const row = rowRef.current;
    if (!row) return null;
    const tiles = [...row.querySelectorAll<HTMLElement>("[data-result-index]")];
    for (const tile of tiles) {
      const rect = tile.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const index = Number(tile.dataset.resultIndex);
        return Number.isFinite(index) ? index : null;
      }
    }
    const dragUrl = dragRef.current?.url;
    let homeDist = Infinity;
    let best: number | null = null;
    let bestDist = Infinity;
    let reach = 40;
    for (const tile of tiles) {
      const rect = tile.getBoundingClientRect();
      reach = Math.max(rect.width, rect.height) * 0.72;
      const dist = Math.hypot(
        x - (rect.left + rect.width / 2),
        y - (rect.top + rect.height / 2)
      );
      const index = Number(tile.dataset.resultIndex);
      if (!Number.isFinite(index)) continue;
      if (urlsRef.current[index] === dragUrl) homeDist = dist;
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    }
    if (best == null || bestDist > reach || bestDist + 8 >= homeDist) return null;
    return best;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>, url: string) {
    if (!enabled || event.button !== 0) return;
    dragRef.current = {
      url,
      active: false,
      x: event.clientX,
      y: event.clientY,
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: 0,
      offsetY: 0,
      width: 0,
      height: 0,
      started: Date.now(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    drag.pointerX = event.clientX;
    drag.pointerY = event.clientY;
    if (!drag.active) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) < 6) return;
      const rect = event.currentTarget.getBoundingClientRect();
      drag.active = true;
      drag.offsetX = drag.x - rect.left;
      drag.offsetY = drag.y - rect.top;
      drag.width = rect.width;
      drag.height = rect.height;
      suppressClickRef.current = true;
      setDraggingUrl(drag.url);
    }
    placeGhost(event.clientX, event.clientY);
    const target = indexAtPoint(event.clientX, event.clientY);
    const from = urlsRef.current.indexOf(drag.url);
    if (target == null || from < 0 || target === from) return;
    reorder(from, target);
  }

  function endDrag() {
    const drag = dragRef.current;
    const held = drag != null && Date.now() - drag.started > 280;
    if (drag?.active || held) suppressClickRef.current = true;
    dragRef.current = null;
    setDraggingUrl(null);
  }

  function consumeSuppressedClick() {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }

  const ghost =
    draggingUrl && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={attachGhost}
            className="specialist-transforms-editor__ghost"
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewFor?.(draggingUrl) || draggingUrl}
              alt=""
              draggable={false}
            />
          </div>,
          document.body
        )
      : null;

  return {
    rowRef,
    draggingUrl,
    ghost,
    consumeSuppressedClick,
    onPointerDown,
    onPointerMove,
    endDrag,
  };
}

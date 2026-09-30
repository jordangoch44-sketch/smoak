"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { cn } from "@/lib/utils";

const REVEAL_PX = 88;
const DRAG_START_PX = 8;
/** Past this share of the card width, letting go removes without tapping Remove. */
const FULL_SWIPE_RATIO = 0.55;
const SETTLE_MS = 260;

type Gesture = "idle" | "pending" | "drag" | "scroll";

function translateContent(content: HTMLElement | null, px: number, animate: boolean) {
  if (!content) return;
  content.style.transition = animate
    ? `transform ${SETTLE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
    : "none";
  content.style.transform = px ? `translate3d(${px}px, 0, 0)` : "";
}

/** iOS-style row: drag left to reveal Remove, or swipe all the way to remove. */
export function SwipeToRemove({
  children,
  label,
  onRemove,
  className,
}: {
  children: ReactNode;
  /** Screen reader name for the Remove action, e.g. "Remove Bench press". */
  label: string;
  onRemove: () => void;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture>("idle");
  const start = useRef({ x: 0, y: 0, offset: 0 });
  const offset = useRef(0);
  const swallowClick = useRef(false);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);

  function place(px: number, animate: boolean) {
    offset.current = px;
    translateContent(contentRef.current, px, animate);
  }

  function settle(next: "open" | "closed") {
    place(next === "open" ? -REVEAL_PX : 0, true);
    setOpen(next === "open");
  }

  function remove() {
    if (removing) return;
    const root = rootRef.current;
    const width = root?.offsetWidth ?? 320;
    setRemoving(true);
    place(-width, true);
    if (root) {
      root.style.height = `${root.offsetHeight}px`;
      requestAnimationFrame(() => {
        root.style.height = "0px";
      });
    }
    window.setTimeout(onRemove, SETTLE_MS);
  }

  useEffect(() => {
    if (!open) return;
    function onOutside(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      offset.current = 0;
      translateContent(contentRef.current, 0, true);
      setOpen(false);
    }
    document.addEventListener("pointerdown", onOutside, true);
    return () => document.removeEventListener("pointerdown", onOutside, true);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "client-workouts-swipe",
        (open || dragging || removing) && "client-workouts-swipe--active",
        removing && "client-workouts-swipe--removing",
        className
      )}
    >
      <FastActivateButton
        className="client-workouts-swipe__action"
        aria-label={label}
        tabIndex={open ? 0 : -1}
        onActivate={remove}
      >
        Remove
      </FastActivateButton>
      <div
        ref={contentRef}
        className="client-workouts-swipe__content"
        onPointerDown={(event) => {
          if (removing || !event.isPrimary) return;
          gesture.current = "pending";
          start.current = { x: event.clientX, y: event.clientY, offset: offset.current };
        }}
        onPointerMove={(event) => {
          if (gesture.current === "idle" || gesture.current === "scroll") return;
          const dx = event.clientX - start.current.x;
          const dy = event.clientY - start.current.y;
          if (gesture.current === "pending") {
            if (Math.abs(dy) > DRAG_START_PX && Math.abs(dy) > Math.abs(dx)) {
              gesture.current = "scroll";
              return;
            }
            if (Math.abs(dx) < DRAG_START_PX) return;
            gesture.current = "drag";
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          const width = rootRef.current?.offsetWidth ?? 320;
          const raw = start.current.offset + dx;
          place(Math.min(0, Math.max(-width, raw)), false);
        }}
        onPointerUpCapture={(event) => {
          const was = gesture.current;
          gesture.current = "idle";
          swallowClick.current = was === "drag" || open;
          if (was === "drag") {
            event.stopPropagation();
            setDragging(false);
            const width = rootRef.current?.offsetWidth ?? 320;
            if (offset.current < -width * FULL_SWIPE_RATIO) {
              remove();
              return;
            }
            settle(offset.current < -REVEAL_PX / 2 ? "open" : "closed");
            return;
          }
          if (open) {
            event.stopPropagation();
            settle("closed");
          }
        }}
        onClickCapture={(event) => {
          if (!swallowClick.current) return;
          swallowClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerCancel={() => {
          if (gesture.current === "drag") {
            setDragging(false);
            settle(offset.current < -REVEAL_PX / 2 ? "open" : "closed");
          }
          gesture.current = "idle";
        }}
      >
        {children}
      </div>
    </div>
  );
}

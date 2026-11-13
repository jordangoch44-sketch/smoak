"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface HorizontalCarouselProps {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
  /** Accessible name for the scroll region */
  ariaLabel: string;
  /**
   * Side arrows for desktop pointer layouts (1024px and up, outside the
   * native app). The scroll track is unchanged on phones.
   */
  desktopArrows?: boolean;
}

const EDGE_EPSILON = 8;

/**
 * Snap-scrolling horizontal gallery — hidden scrollbar, momentum on touch.
 * Optional desktop arrows page the same track; they stay hidden below 1024px
 * and inside the native app.
 */
export function HorizontalCarousel({
  children,
  className,
  trackClassName,
  ariaLabel,
  desktopArrows = false,
}: HorizontalCarouselProps) {
  const trackId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!track) return;

    const max = track.scrollWidth - track.clientWidth;
    setCanPrev(track.scrollLeft > EDGE_EPSILON);
    setCanNext(max > EDGE_EPSILON && track.scrollLeft < max - EDGE_EPSILON);

    if (!root) return;
    const media = track.querySelector<HTMLElement>(".home-portrait-card__media");
    if (!media) {
      root.style.removeProperty("--carousel-nav-center");
      return;
    }
    const mediaBox = media.getBoundingClientRect();
    if (mediaBox.height < 8) {
      root.style.removeProperty("--carousel-nav-center");
      return;
    }
    const rootBox = root.getBoundingClientRect();
    const center = mediaBox.top - rootBox.top + mediaBox.height / 2;
    root.style.setProperty("--carousel-nav-center", `${center}px`);
  }, []);

  useLayoutEffect(() => {
    if (!desktopArrows) return;
    const track = trackRef.current;
    if (!track) return;

    sync();
    track.addEventListener("scroll", sync, { passive: true });
    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(track);
    const mutationObserver = new MutationObserver(sync);
    mutationObserver.observe(track, { childList: true });
    window.addEventListener("resize", sync);

    return () => {
      track.removeEventListener("scroll", sync);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [desktopArrows, sync]);

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;

    const first = track.firstElementChild;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    const cardWidth =
      first instanceof HTMLElement ? first.getBoundingClientRect().width : 0;
    const stride = cardWidth + gap;
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    let left: number;

    if (stride > EDGE_EPSILON) {
      const visible = Math.max(
        1,
        Math.floor((track.clientWidth + gap) / stride)
      );
      const count = Math.max(1, visible > 1 ? visible - 1 : 1);
      const index = Math.round(track.scrollLeft / stride);
      const next = Math.max(0, index + direction * count);
      left = Math.min(max, next * stride);
    } else {
      left = Math.min(
        max,
        Math.max(0, track.scrollLeft + direction * track.clientWidth * 0.85)
      );
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "horizontal-carousel",
        desktopArrows && "horizontal-carousel--desktop-nav",
        className
      )}
    >
      {desktopArrows ? (
        <button
          type="button"
          className="horizontal-carousel__nav horizontal-carousel__nav--prev smoac-control"
          hidden={!canPrev}
          aria-controls={trackId}
          aria-label={`Previous in ${ariaLabel}`}
          onClick={() => move(-1)}
        >
          <ChevronLeftIcon className="horizontal-carousel__nav-icon" />
        </button>
      ) : null}
      <div
        ref={trackRef}
        id={trackId}
        className={cn("horizontal-carousel__track", trackClassName)}
        role="list"
        aria-label={ariaLabel}
      >
        {children}
      </div>
      {desktopArrows ? (
        <button
          type="button"
          className="horizontal-carousel__nav horizontal-carousel__nav--next smoac-control"
          hidden={!canNext}
          aria-controls={trackId}
          aria-label={`Next in ${ariaLabel}`}
          onClick={() => move(1)}
        >
          <ChevronRightIcon className="horizontal-carousel__nav-icon" />
        </button>
      ) : null}
    </div>
  );
}

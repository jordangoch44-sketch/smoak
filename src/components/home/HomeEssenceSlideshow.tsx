"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import {
  getDefaultHomeEssenceConfig,
  HOME_ESSENCE_DEFAULT_INTERVAL_MS,
  listActiveHomeEssenceSlides,
  type HomeEssenceSlide,
} from "@/lib/home-essence-slides";
import { cn } from "@/lib/utils";

const SWIPE_MIN_PX = 48;
const SWIPE_AXIS_RATIO = 1.2;

type PublicSlide = Pick<HomeEssenceSlide, "id" | "src" | "alt">;

function defaultPublicSlides(): PublicSlide[] {
  return listActiveHomeEssenceSlides(getDefaultHomeEssenceConfig()).map(
    (slide) => ({
      id: slide.id,
      src: slide.src,
      alt: slide.alt,
    })
  );
}

/**
 * Full-bleed lifestyle strip under the marketplace lede — Apple-style
 * slow crossfade with single-finger swipe. Config from Admin → Settings.
 */
export function HomeEssenceSlideshow() {
  const reducedMotion = useReducedMotion();
  const [slides, setSlides] = useState<PublicSlide[]>(defaultPublicSlides);
  const [intervalMs, setIntervalMs] = useState(HOME_ESSENCE_DEFAULT_INTERVAL_MS);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const swipeRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/homepage-essence")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          body:
            | {
                ok?: boolean;
                intervalMs?: number;
                slides?: PublicSlide[];
              }
            | null
        ) => {
          if (cancelled || !body?.ok || !Array.isArray(body.slides)) return;
          if (body.slides.length === 0) {
            setSlides([]);
            return;
          }
          setSlides(
            body.slides.map((slide) => ({
              id: String(slide.id),
              src: String(slide.src),
              alt: String(slide.alt || "SMOAC"),
            }))
          );
          if (
            typeof body.intervalMs === "number" &&
            Number.isFinite(body.intervalMs)
          ) {
            setIntervalMs(body.intervalMs);
          }
          setIndex(0);
        }
      )
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || paused || slides.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [paused, reducedMotion, slides.length, intervalMs]);

  useEffect(() => {
    if (index >= slides.length && slides.length > 0) {
      setIndex(0);
    }
  }, [index, slides.length]);

  function goTo(next: number) {
    const len = slides.length;
    if (len < 2) return;
    setIndex(((next % len) + len) % len);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    swipeRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      active: true,
    };
    setPaused(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start?.active || start.pointerId !== event.pointerId) {
      setPaused(false);
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const horizontal =
      Math.abs(dx) >= SWIPE_MIN_PX &&
      Math.abs(dx) >= Math.abs(dy) * SWIPE_AXIS_RATIO;

    if (horizontal) {
      goTo(index + (dx < 0 ? 1 : -1));
    }

    setPaused(false);
  }

  function onPointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (swipeRef.current?.pointerId === event.pointerId) {
      swipeRef.current = null;
    }
    setPaused(false);
  }

  if (slides.length === 0) return null;

  return (
    <div
      className="home-essence"
      role="region"
      aria-roledescription="carousel"
      aria-label="SMOAC lifestyle"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div
        className="home-essence__frame"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={cn(
              "home-essence__slide",
              i === index && "home-essence__slide--active"
            )}
            aria-hidden={i !== index}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.src}
              alt={i === index ? slide.alt : ""}
              className="home-essence__img"
              draggable={false}
              decoding="async"
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
            />
          </div>
        ))}
        <div className="home-essence__veil" aria-hidden />
      </div>

      {slides.length > 1 ? (
        <div className="home-essence__dots" role="tablist" aria-label="Slides">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show slide ${i + 1}`}
              className={cn(
                "home-essence__dot",
                i === index && "home-essence__dot--active"
              )}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

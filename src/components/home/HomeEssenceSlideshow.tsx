"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  HOME_ESSENCE_INTERVAL_MS,
  HOME_ESSENCE_SLIDES,
} from "@/lib/home-essence-slides";
import { cn } from "@/lib/utils";

/**
 * Full-bleed lifestyle strip under the marketplace lede — Apple-style
 * slow crossfade, no on-image marketing copy.
 */
export function HomeEssenceSlideshow() {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = HOME_ESSENCE_SLIDES;

  useEffect(() => {
    if (reducedMotion || paused || slides.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, HOME_ESSENCE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, reducedMotion, slides.length]);

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
      <div className="home-essence__frame">
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

      {slides.length > 1 && !reducedMotion ? (
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
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

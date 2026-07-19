"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

const SPECIALIST_TITLES = [
  "Coach",
  "Trainer",
  "Nutritionist",
  "Physical Therapist",
  "Wellness Expert",
] as const;

const TYPE_MS = 58;
const HOLD_MS = 1500;
const STATIC_TITLE = "Trainer";

type Phase = "typing" | "holding";

/**
 * Fixed “Find your perfect” + typewriter specialist titles.
 * Types each word, holds, then jumps to the next (no delete / slide).
 */
export function RotatingSpecialistHeadline() {
  const reduceMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [typedLen, setTypedLen] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");

  const fullTitle = SPECIALIST_TITLES[index] ?? STATIC_TITLE;
  const typedTitle = fullTitle.slice(0, typedLen);

  useEffect(() => {
    if (reduceMotion) return;

    let delay = TYPE_MS;
    let tick: (() => void) | null = null;

    if (phase === "typing") {
      if (typedLen < fullTitle.length) {
        tick = () => setTypedLen((len) => len + 1);
      } else {
        delay = 0;
        tick = () => setPhase("holding");
      }
    } else {
      delay = HOLD_MS;
      tick = () => {
        setIndex((current) => (current + 1) % SPECIALIST_TITLES.length);
        setTypedLen(0);
        setPhase("typing");
      };
    }

    if (!tick) return;

    const id = window.setTimeout(tick, delay);
    return () => window.clearTimeout(id);
  }, [reduceMotion, phase, typedLen, fullTitle]);

  return (
    <h1
      className="home-hero__title rotating-headline"
      aria-label="Find your perfect health and wellness specialist"
    >
      <span className="home-hero__title-line" aria-hidden>
        Find your perfect
      </span>

      {reduceMotion ? (
        <span
          className="rotating-headline__static"
          aria-hidden
        >
          {STATIC_TITLE}
        </span>
      ) : (
        <span className="rotating-headline__typed" aria-hidden>
          <span className="rotating-headline__word">{typedTitle}</span>
          <span
            className={cn(
              "rotating-headline__cursor",
              phase === "holding" && "rotating-headline__cursor--blink"
            )}
          />
        </span>
      )}
    </h1>
  );
}

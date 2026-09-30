"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { cn } from "@/lib/utils";
import { ClientSuggestedWorkout } from "./ClientSuggestedWorkout";
import { ClientWeekOverview } from "./ClientWeekOverview";
import { ClientWorkoutsEntry } from "./ClientWorkoutsEntry";
import "@/styles/client-workouts.css";

const PAGES = [
  { id: "week", label: "This week’s overview" },
  { id: "log", label: "Workouts" },
  { id: "generator", label: "Workout generator" },
] as const;
const START_INDEX = 1;

function slideStep(track: HTMLDivElement): number {
  const slides = track.children;
  if (slides.length < 2) return track.clientWidth || 1;
  return (
    (slides[1] as HTMLElement).offsetLeft - (slides[0] as HTMLElement).offsetLeft || 1
  );
}

/** Swipeable workouts box: this week’s overview ← workouts (start) → workout generator. */
export function ClientWorkoutsCarousel({ userId }: { userId: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const [active, setActive] = useState(START_INDEX);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = START_INDEX * slideStep(track);
  }, []);

  function handleScroll() {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      const track = trackRef.current;
      if (!track) return;
      const index = Math.round(track.scrollLeft / slideStep(track));
      setActive(Math.min(PAGES.length - 1, Math.max(0, index)));
    });
  }

  function goTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({
      left: index * slideStep(track),
      behavior: reduce ? "auto" : "smooth",
    });
  }

  function slideClass(index: number) {
    return cn(
      "client-workouts-carousel__slide",
      active !== index && "client-workouts-carousel__slide--away"
    );
  }

  return (
    <div className="client-workouts-carousel">
      <div className="client-workouts-carousel__dots" aria-label="Workouts pages">
        {PAGES.map((page, index) => (
          <FastActivateButton
            key={page.id}
            className={cn(
              "client-workouts-carousel__dot",
              active === index && "client-workouts-carousel__dot--active"
            )}
            aria-label={page.label}
            aria-current={active === index ? "true" : undefined}
            onActivate={() => goTo(index)}
          />
        ))}
      </div>

      <div
        ref={trackRef}
        className="client-workouts-carousel__track"
        onScroll={handleScroll}
      >
        <section className={slideClass(0)} aria-label={PAGES[0].label}>
          <ClientWeekOverview userId={userId} />
        </section>
        <section className={slideClass(1)} aria-label={PAGES[1].label}>
          <ClientWorkoutsEntry userId={userId} />
        </section>
        <section className={slideClass(2)} aria-label={PAGES[2].label}>
          <ClientSuggestedWorkout userId={userId} />
        </section>
      </div>
    </div>
  );
}

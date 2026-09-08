"use client";

import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { HomePortraitSpecialistCard } from "@/components/home/HomePortraitSpecialistCard";
import type { Trainer } from "@/types";

interface ExploreSuggestedSpecialistsProps {
  trainers: Trainer[];
}

/**
 * Horizontal suggestions when the ZIP radius has no matches.
 * Display-only — does not write specialist profiles.
 */
export function ExploreSuggestedSpecialists({
  trainers,
}: ExploreSuggestedSpecialistsProps) {
  if (trainers.length === 0) return null;

  return (
    <section
      className="explore-suggested"
      aria-labelledby="explore-suggested-heading"
    >
      <header className="explore-suggested__header">
        <h3 id="explore-suggested-heading" className="explore-suggested__title">
          Suggested specialists
        </h3>
        <p className="explore-suggested__lede">
          Nearest matches by proximity and category.
        </p>
      </header>

      <HorizontalCarousel
        className="explore-suggested__carousel"
        ariaLabel="Suggested specialists"
      >
        {trainers.map((trainer, index) => (
          <HomePortraitSpecialistCard
            key={trainer.id}
            trainer={trainer}
            priority={index < 2}
            impressionSurface="explore"
          />
        ))}
      </HorizontalCarousel>
    </section>
  );
}

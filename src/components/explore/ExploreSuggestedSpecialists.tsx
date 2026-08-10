"use client";

import { useRouter } from "next/navigation";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { TapLink } from "@/components/ui/TapLink";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { TrainerCardDetails } from "@/components/trainers/TrainerCardDetails";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import { SpecialistImpressionBeacon } from "@/components/trainers/SpecialistImpressionBeacon";
import { primeTrainerProfile } from "@/lib/primed-trainer-profile";
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
  const router = useRouter();

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
        {trainers.map((trainer, index) => {
          const href = `/trainers/${encodeURIComponent(trainer.id)}`;
          return (
            <div
              key={trainer.id}
              className="home-portrait-card relative"
              role="listitem"
            >
              <SpecialistImpressionBeacon
                specialistId={trainer.id}
                surface="explore"
              />
              <TapLink
                href={href}
                className="home-portrait-card__link"
                onClick={() => {
                  primeTrainerProfile(trainer);
                  try {
                    router.prefetch(href);
                  } catch {
                    /* best-effort */
                  }
                }}
              >
                <article className="home-portrait-card__article">
                  <div className="home-portrait-card__media">
                    <TrainerThumbnail
                      src={trainer.image}
                      name={trainer.name}
                      size="card"
                      priority={index < 2}
                      className="home-portrait-card__thumb"
                      imageClassName="home-portrait-card__thumb-img"
                    />
                    <div className="home-portrait-card__scrim" aria-hidden />
                  </div>
                  <div className="home-portrait-card__body">
                    <TrainerCardDetails
                      trainer={trainer}
                      nameClassName="home-portrait-card__name"
                      professionClassName="home-portrait-card__profession"
                      locationClassName="home-portrait-card__location"
                      distanceClassName="home-portrait-card__distance"
                      footerClassName="home-portrait-card__meta"
                      metaLayout="inline"
                    />
                  </div>
                </article>
              </TapLink>
              <TrainerCardSaveSlot trainerId={trainer.id} />
            </div>
          );
        })}
      </HorizontalCarousel>
    </section>
  );
}

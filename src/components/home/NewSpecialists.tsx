"use client";

import { useMemo } from "react";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { TapLink } from "@/components/ui/TapLink";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import {
  useActiveUserCoordinates,
  useActiveUserCoordinatesKey,
} from "@/hooks/useActiveUserCoordinates";
import { useHydrated } from "@/hooks/useHydrated";
import { usePersonalizationCity } from "@/hooks/usePersonalizationCity";
import { listPublicNewTrainers } from "@/lib/marketplace-public-catalog";
import { sortTrainersByPersonalizationCity } from "@/lib/personalized-trainers";
import {
  formatTrainerDistanceLabel,
  formatTrainerPriceLabel,
  formatTrainerRatingLabel,
} from "@/lib/home-discovery";

export function NewSpecialists() {
  const hydrated = useHydrated();
  const personalizationCity = usePersonalizationCity();
  const userCoords = useActiveUserCoordinates();
  const coordsKey = useActiveUserCoordinatesKey();

  const newcomers = useMemo(() => {
    const coords = hydrated ? userCoords : null;
    return sortTrainersByPersonalizationCity(
      listPublicNewTrainers(),
      hydrated ? personalizationCity : null,
      coords
    ).slice(0, 8);
  }, [hydrated, personalizationCity, coordsKey, userCoords]);

  if (newcomers.length === 0) return null;

  return (
    <section
      className="home-new home-section-aurora"
      aria-labelledby="home-new-heading"
    >
      <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
        <header className="home-section__header">
          <h2 id="home-new-heading" className="home-section__title">
            New Specialists
          </h2>
          <p className="home-section__subtitle">
            Newest verified professionals joining SMOAC.
          </p>
        </header>

        <HorizontalCarousel
          className="home-new__carousel"
          ariaLabel="New specialists"
        >
          {newcomers.map((trainer, index) => {
            const href = `/trainers/${trainer.id}`;
            const distance =
              hydrated && userCoords
                ? formatTrainerDistanceLabel(trainer, userCoords)
                : null;

            return (
              <div key={trainer.id} className="home-portrait-card" role="listitem">
                <TapLink href={href} className="home-portrait-card__link">
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
                      <h3 className="home-portrait-card__name">{trainer.name}</h3>
                      <p className="home-portrait-card__profession">
                        {trainer.profession}
                      </p>
                      <div className="home-portrait-card__meta">
                        <span>
                          <span aria-hidden>★ </span>
                          {formatTrainerRatingLabel(trainer)}
                        </span>
                        {distance ? <span>{distance}</span> : null}
                      </div>
                      <p className="home-portrait-card__price">
                        {formatTrainerPriceLabel(trainer.pricePerSession)}
                      </p>
                    </div>
                  </article>
                </TapLink>
                <TrainerCardSaveSlot trainerId={trainer.id} />
              </div>
            );
          })}
        </HorizontalCarousel>
      </div>
    </section>
  );
}

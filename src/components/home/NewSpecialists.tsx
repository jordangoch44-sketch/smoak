"use client";

import { useEffect, useMemo } from "react";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { TapLink } from "@/components/ui/TapLink";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { DevTrainerDistance } from "@/components/trainers/DevTrainerDistance";
import { LocationLabel } from "@/components/trainers/LocationLabel";
import { SpecialtyChips } from "@/components/trainers/SpecialtyChips";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import { SpecialistImpressionBeacon } from "@/components/trainers/SpecialistImpressionBeacon";
import {
  useActiveUserCoordinates,
  useActiveUserCoordinatesKey,
} from "@/hooks/useActiveUserCoordinates";
import { useHydrated } from "@/hooks/useHydrated";
import { usePersonalizationCity } from "@/hooks/usePersonalizationCity";
import { primePublicCatalogFromSSR } from "@/lib/approved-specialist-profiles-store";
import { listPublicNewTrainers } from "@/lib/marketplace-public-catalog";
import { sortTrainersByPersonalizationCity } from "@/lib/personalized-trainers";
import {
  formatTrainerPriceLabel,
  formatTrainerRatingLabel,
} from "@/lib/home-discovery";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import type { Trainer } from "@/types/trainer";

export function NewSpecialists({
  initialCatalog,
  catalogMode = "live",
}: {
  initialCatalog?: Trainer[];
  catalogMode?: PublicCatalogMode;
}) {
  const hydrated = useHydrated();
  const personalizationCity = usePersonalizationCity();
  const userCoords = useActiveUserCoordinates();
  const coordsKey = useActiveUserCoordinatesKey();

  useEffect(() => {
    primePublicCatalogFromSSR(initialCatalog, catalogMode);
  }, [initialCatalog, catalogMode]);

  const newcomers = useMemo(() => {
    const coords = hydrated ? userCoords : null;
    return sortTrainersByPersonalizationCity(
      listPublicNewTrainers({
        includeBrowserState: hydrated,
        remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
        catalogMode,
      }),
      hydrated ? personalizationCity : null,
      coords
    ).slice(0, 8);
  }, [
    hydrated,
    personalizationCity,
    coordsKey,
    userCoords,
    initialCatalog,
    catalogMode,
  ]);

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

            return (
              <div key={trainer.id} className="home-portrait-card relative" role="listitem">
                <SpecialistImpressionBeacon
                  specialistId={trainer.id}
                  surface="home_new"
                />
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
                      <LocationLabel
                        provider={trainer}
                        className="home-portrait-card__location"
                      />
                      <DevTrainerDistance
                        trainer={trainer}
                        className="home-portrait-card__distance"
                      />
                      <SpecialtyChips
                        specialties={trainer.specialty}
                        className="home-portrait-card__chips specialty-chips--row"
                      />
                      <div className="home-portrait-card__meta">
                        <span>
                          {trainer.reviewCount > 0 ? (
                            <>
                              <span aria-hidden>★ </span>
                              {formatTrainerRatingLabel(trainer)}
                            </>
                          ) : (
                            formatTrainerRatingLabel(trainer)
                          )}
                        </span>
                        <span>
                          {formatTrainerPriceLabel(trainer.pricePerSession)}
                        </span>
                      </div>
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

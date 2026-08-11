"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { TapLink } from "@/components/ui/TapLink";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { TrainerCardDetails } from "@/components/trainers/TrainerCardDetails";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import { TrainerVerifiedCheck } from "@/components/trainers/TrainerVerifiedCheck";
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
import { primeTrainerProfile } from "@/lib/primed-trainer-profile";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import type { Trainer } from "@/types/trainer";

export function NewSpecialists({
  initialCatalog,
  catalogMode = "live",
}: {
  initialCatalog?: Trainer[];
  catalogMode?: PublicCatalogMode;
}) {
  const router = useRouter();
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

  /* Warm the soft-nav intercept so the sheet can mount without a cold RSC wait. */
  useEffect(() => {
    if (!hydrated || newcomers.length === 0) return;
    for (const trainer of newcomers.slice(0, 4)) {
      try {
        router.prefetch(`/trainers/${trainer.id}`);
      } catch {
        /* prefetch is best-effort */
      }
    }
  }, [hydrated, newcomers, router]);

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
              <div
                key={trainer.id}
                className="home-portrait-card relative"
                role="listitem"
              >
                <SpecialistImpressionBeacon
                  specialistId={trainer.id}
                  surface="home_new"
                />
                <TapLink
                  href={href}
                  className="home-portrait-card__link"
                  onClick={() => primeTrainerProfile(trainer)}
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
                      <TrainerVerifiedCheck
                        trainer={trainer}
                        className="home-portrait-card__verified"
                      />
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
      </div>
    </section>
  );
}

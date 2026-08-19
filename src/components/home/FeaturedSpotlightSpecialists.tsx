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
  useMarketplacePersonalizationCity,
  useMarketplaceUserCoordinates,
  useMarketplaceUserCoordinatesKey,
} from "@/hooks/useMarketplaceGeo";
import { useHydrated } from "@/hooks/useHydrated";
import { primePublicCatalogFromSSR } from "@/lib/approved-specialist-profiles-store";
import {
  listPublicFeaturedTrainers,
  selectFeaturedSpotlightTrainers,
} from "@/lib/paid-placements";
import { warmTrainerProfileNavigation } from "@/lib/warm-trainer-profile-navigation";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import type { Trainer } from "@/types/trainer";

/** Homepage featured spotlight — portrait rail matching New Specialists. */
export function FeaturedSpotlightSpecialists({
  initialCatalog,
  catalogMode = "live",
}: {
  initialCatalog?: Trainer[];
  catalogMode?: PublicCatalogMode;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const personalizationCity = useMarketplacePersonalizationCity();
  const userCoords = useMarketplaceUserCoordinates();
  const coordsKey = useMarketplaceUserCoordinatesKey();

  useEffect(() => {
    primePublicCatalogFromSSR(initialCatalog, catalogMode);
  }, [initialCatalog, catalogMode]);

  const featuredPool = useMemo(
    () =>
      listPublicFeaturedTrainers({
        includeBrowserState: hydrated,
        remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
        catalogMode,
      }),
    [hydrated, initialCatalog, catalogMode]
  );

  const rail = useMemo(
    () =>
      selectFeaturedSpotlightTrainers(featuredPool, {
        personalizationCity: hydrated ? personalizationCity : null,
        userCoords: hydrated ? userCoords : null,
      }),
    [featuredPool, hydrated, personalizationCity, coordsKey, userCoords]
  );

  useEffect(() => {
    if (!hydrated || rail.trainers.length === 0) return;
    for (const trainer of rail.trainers.slice(0, 4)) {
      try {
        router.prefetch(`/trainers/${trainer.id}`);
      } catch {
        /* prefetch is best-effort */
      }
    }
  }, [hydrated, rail.trainers, router]);

  if (rail.trainers.length === 0) return null;

  return (
    <section
      className="home-featured home-section-aurora"
      aria-labelledby="home-featured-heading"
    >
      <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
        <header className="home-section__header">
          <h2 id="home-featured-heading" className="home-section__title">
            Featured Specialists
          </h2>
          <p className="home-section__subtitle">
            {rail.isLocal
              ? "Highlighted professionals elevating their presence in your area."
              : "Highlighted verified professionals on SMOAC."}
          </p>
        </header>

        <HorizontalCarousel
          className="home-featured__carousel"
          ariaLabel="Featured specialists"
        >
          {rail.trainers.map((trainer, index) => {
            const href = `/trainers/${trainer.id}`;

            return (
              <div
                key={trainer.id}
                className="home-portrait-card relative"
                role="listitem"
              >
                <SpecialistImpressionBeacon
                  specialistId={trainer.id}
                  surface="home_featured"
                />
                <TapLink
                  href={href}
                  className="home-portrait-card__link"
                  onPointerDown={() =>
                    warmTrainerProfileNavigation(trainer, router)
                  }
                  onClick={() => warmTrainerProfileNavigation(trainer, router)}
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

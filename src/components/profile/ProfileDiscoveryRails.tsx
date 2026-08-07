"use client";

import { useMemo } from "react";
import type { Trainer } from "@/types";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import { TapLink } from "@/components/ui/TapLink";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import { TrainerCardSmoacRating } from "@/components/trainers/TrainerCardSmoacRating";
import { LocationLabel } from "@/components/trainers/LocationLabel";
import { SpecialistImpressionBeacon } from "@/components/trainers/SpecialistImpressionBeacon";
import { SponsoredSpecialistCard } from "@/components/home/SponsoredSpecialistCard";
import { useHydrated } from "@/hooks/useHydrated";
import { formatTrainerPriceLabel } from "@/lib/home-discovery";
import {
  getFeaturedSpecialistsNearTrainer,
  getSimilarSpecialists,
} from "@/lib/related-trainers";

interface ProfileDiscoveryRailsProps {
  trainer: Trainer;
}

function SimilarSpecialistCard({
  trainer,
  priority,
}: {
  trainer: Trainer;
  priority?: boolean;
}) {
  const href = `/trainers/${trainer.id}`;
  return (
    <div className="home-portrait-card relative" role="listitem">
      <SpecialistImpressionBeacon
        specialistId={trainer.id}
        surface="profile_rail"
      />
      <TapLink href={href} className="home-portrait-card__link">
        <article className="home-portrait-card__article">
          <div className="home-portrait-card__media">
            <TrainerThumbnail
              src={trainer.image}
              name={trainer.name}
              size="card"
              priority={priority}
              className="home-portrait-card__thumb"
              imageClassName="home-portrait-card__thumb-img"
            />
            <div className="home-portrait-card__scrim" aria-hidden />
          </div>
          <div className="home-portrait-card__body">
            <h3 className="home-portrait-card__name">{trainer.name}</h3>
            <p className="home-portrait-card__profession">{trainer.profession}</p>
            <LocationLabel
              provider={trainer}
              className="home-portrait-card__location"
            />
            <div className="home-portrait-card__meta">
              <TrainerCardSmoacRating trainerId={trainer.id} />
              <span>{formatTrainerPriceLabel(trainer.pricePerSession)}</span>
            </div>
          </div>
        </article>
      </TapLink>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
}

export function ProfileDiscoveryRails({ trainer }: ProfileDiscoveryRailsProps) {
  const hydrated = useHydrated();

  const featured = useMemo(() => {
    if (!hydrated) return [];
    return getFeaturedSpecialistsNearTrainer(trainer, 8);
  }, [hydrated, trainer]);

  const similar = useMemo(() => {
    if (!hydrated) return [];
    const featuredIds = new Set(featured.map((t) => t.id));
    return getSimilarSpecialists(trainer, 10).filter(
      (t) => !featuredIds.has(t.id)
    );
  }, [hydrated, trainer, featured]);

  if (featured.length === 0 && similar.length === 0) return null;

  return (
    <div className="profile-discovery">
      {featured.length > 0 ? (
        <section
          className="profile-discovery__section"
          aria-labelledby="profile-featured-heading"
        >
          <header className="profile-discovery__header">
            <h2 id="profile-featured-heading" className="profile-discovery__title">
              Featured Specialists Near You
            </h2>
            <p className="profile-discovery__subtitle">
              Featured listings in and around {trainer.city}.
            </p>
          </header>
          <HorizontalCarousel
            className="profile-discovery__carousel"
            ariaLabel="Featured specialists near you"
          >
            {featured.map((card, index) => (
              <SponsoredSpecialistCard
                key={card.id}
                trainer={card}
                priority={index < 2}
                showSponsoredBadge={Boolean(card.sponsored)}
                impressionSurface="profile_rail"
              />
            ))}
          </HorizontalCarousel>
        </section>
      ) : null}

      {similar.length > 0 ? (
        <section
          className="profile-discovery__section"
          aria-labelledby="profile-similar-heading"
        >
          <header className="profile-discovery__header">
            <h2 id="profile-similar-heading" className="profile-discovery__title">
              Similar Specialists
            </h2>
            <p className="profile-discovery__subtitle">
              Related professions and specialties worth comparing.
            </p>
          </header>
          <HorizontalCarousel
            className="profile-discovery__carousel"
            ariaLabel="Similar specialists"
          >
            {similar.map((card, index) => (
              <SimilarSpecialistCard
                key={card.id}
                trainer={card}
                priority={index < 2}
              />
            ))}
          </HorizontalCarousel>
        </section>
      ) : null}
    </div>
  );
}

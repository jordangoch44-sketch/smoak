"use client";

import { useCallback, useState, type MouseEvent } from "react";
import type { Trainer } from "@/types";
import { getTrainerCityRanking } from "@/data/city-rankings";
import { formatProviderLocation } from "@/lib/provider-location";
import { firstSentence } from "@/lib/related-trainers";
import {
  buildTrainerGalleryImages,
  getProfileGalleryMedia,
} from "@/lib/trainer-gallery";
import { SessionPrice } from "@/components/ui/SessionPrice";
import { ShieldCheckIcon } from "@/components/ui/icons";
import { ProfileHeroCoverGallery } from "./ProfileHeroCoverGallery";
import { ProfileHeroAvatar } from "./ProfileHeroAvatar";
import { ProfileGalleryModal } from "./ProfileGalleryModal";
import { TrainerMarketValueCard } from "./TrainerMarketValueCard";
import { ProfileHeroToolbar } from "./ProfileHeroToolbar";
import { ProfileRankBadge } from "./ProfileRankBadge";
import { ProfileReviewMeta } from "./ProfileReviewMeta";
import type { SpecialistReviewAggregate } from "@/lib/reviews/specialist-review-types";

interface ProfileHeroProps {
  trainer: Trainer;
  smoacAggregate?: SpecialistReviewAggregate | null;
  canLeaveReview?: boolean;
  hasOwnReview?: boolean;
  onLeaveReview?: () => void;
}

export function ProfileHero({
  trainer,
  smoacAggregate,
  canLeaveReview,
  hasOwnReview,
  onLeaveReview,
}: ProfileHeroProps) {
  const ranking = getTrainerCityRanking(trainer.id);
  const coverImages = buildTrainerGalleryImages(
    trainer.gallery,
    trainer.heroImage,
    trainer.galleryImages
  );
  const galleryMedia = getProfileGalleryMedia(
    trainer.gallery,
    trainer.galleryImages,
    trainer.heroImage
  );
  const [galleryOpen, setGalleryOpen] = useState(false);
  const heroLine = firstSentence(trainer.bio);

  const openGallery = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setGalleryOpen(true);
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryOpen(false);
  }, []);

  return (
    <>
      <section className="profile-hero relative w-full">
        <div className="profile-hero__stage relative w-full">
          <ProfileHeroCoverGallery
            images={coverImages}
            trainerName={trainer.name}
            fallbackHeroImage={trainer.heroImage}
          />
          <div
            className="profile-hero__scrim profile-hero__scrim--top absolute inset-x-0 top-0 z-[1] h-[42%]"
            aria-hidden
          />
          <div className="profile-hero__scrim absolute inset-0 z-[1]" aria-hidden />
          <div
            className="profile-hero__scrim-fade absolute inset-x-0 bottom-0 z-[1] h-[72%]"
            aria-hidden
          />

          <div className="profile-hero__identity absolute inset-x-0 bottom-0 z-10">
            <div className="mx-auto max-w-7xl profile-hero__identity-inner px-4 pb-5 sm:px-6 sm:pb-6">
              <div className="profile-hero__identity-row">
                <ProfileHeroAvatar
                  src={trainer.image}
                  name={trainer.name}
                  rankBadge={
                    ranking ? (
                      <ProfileRankBadge ranking={ranking} placement="avatar" />
                    ) : null
                  }
                />
                <div className="profile-hero__identity-copy min-w-0 flex-1">
                  <div className="profile-hero__name-row">
                    <h1 className="profile-hero__name">{trainer.name}</h1>
                    {trainer.verified ? (
                      <span
                        className="profile-verified-badge"
                        title="Verified specialist"
                      >
                        <ShieldCheckIcon className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <p className="profile-hero__profession">{trainer.profession}</p>
                  {trainer.title ? (
                    <p className="profile-hero__specialty">{trainer.title}</p>
                  ) : null}
                  <p className="profile-hero__location">
                    {formatProviderLocation(trainer)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-hero__content relative px-4 pb-5 sm:px-6 sm:pb-7 lg:pb-8">
          <div className="mx-auto max-w-7xl">
            {heroLine ? (
              <p className="profile-hero__tagline">{heroLine}</p>
            ) : null}

            <div className="profile-hero__meta">
              <div className="profile-hero__meta-primary">
                <ProfileReviewMeta
                  trainer={trainer}
                  smoacAggregate={smoacAggregate}
                  canLeaveReview={canLeaveReview}
                  hasOwnReview={hasOwnReview}
                  onLeaveReview={onLeaveReview}
                />
                <SessionPrice
                  amount={trainer.pricePerSession}
                  variant="hero"
                  className="profile-hero__meta-price shrink-0"
                />
              </div>
              <button
                type="button"
                className="profile-hero__view-gallery"
                aria-label="View specialist gallery"
                onClick={openGallery}
              >
                View Gallery
              </button>
            </div>

            <TrainerMarketValueCard trainer={trainer} />
          </div>
        </div>
      </section>

      <ProfileGalleryModal
        open={galleryOpen}
        media={galleryMedia}
        initialIndex={0}
        trainerName={trainer.name}
        onClose={closeGallery}
      />

      <ProfileHeroToolbar
        trainerId={trainer.id}
        trainerName={trainer.name}
      />
    </>
  );
}

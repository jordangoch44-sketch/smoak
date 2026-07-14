"use client";

import { useRef } from "react";
import type { Trainer } from "@/types";
import { getTrainerCityRanking } from "@/data/city-rankings";
import { formatProviderLocation } from "@/lib/provider-location";
import { firstSentence } from "@/lib/related-trainers";
import {
  buildTrainerGalleryImages,
  getProfileGalleryMedia,
} from "@/lib/trainer-gallery";
import { SessionPrice } from "@/components/ui/SessionPrice";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { ShieldCheckIcon } from "@/components/ui/icons";
import {
  ProfileHeroCoverGallery,
  type ProfileHeroGalleryControl,
} from "./ProfileHeroCoverGallery";
import { TrainerMarketValueCard } from "./TrainerMarketValueCard";
import { ProfileHeroToolbar } from "./ProfileHeroToolbar";
import { ProfileRankBadge } from "./ProfileRankBadge";
import { ProfileReviewMeta } from "./ProfileReviewMeta";

interface ProfileHeroProps {
  trainer: Trainer;
}

export function ProfileHero({ trainer }: ProfileHeroProps) {
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
  const galleryControlRef = useRef<ProfileHeroGalleryControl | null>(null);
  const hasGallery = galleryMedia.length > 0;
  const heroLine = firstSentence(trainer.bio);

  return (
    <>
      <section className="profile-hero relative w-full overflow-hidden">
        <div className="profile-hero__stage relative h-[52vh] min-h-[340px] w-full sm:h-[50vh] sm:min-h-[400px] lg:h-[56vh]">
          <ProfileHeroCoverGallery
            images={coverImages}
            media={galleryMedia}
            trainerName={trainer.name}
            fallbackHeroImage={trainer.heroImage}
            galleryControlRef={galleryControlRef}
          />
          <div
            className="profile-hero__scrim profile-hero__scrim--top absolute inset-x-0 top-0 z-[1] h-[42%]"
            aria-hidden
          />
          <div className="profile-hero__scrim absolute inset-0 z-[1]" aria-hidden />
          <div
            className="profile-hero__scrim-fade absolute inset-x-0 bottom-0 z-[1] h-[70%]"
            aria-hidden
          />

          <div className="profile-hero__identity absolute inset-x-0 bottom-0 z-10 px-4 pb-5 sm:px-6 sm:pb-7">
            <div className="mx-auto max-w-7xl profile-hero__identity-inner">
              <div className="profile-hero__identity-row flex items-end gap-3.5 sm:gap-5">
                <TrainerThumbnail
                  src={trainer.image}
                  name={trainer.name}
                  size="square"
                  priority
                  className="profile-hero__avatar shrink-0 border-2 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.55)]"
                />
                <div className="min-w-0 flex-1 pb-0.5">
                  <div className="profile-hero__name-row flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <h1 className="profile-hero__name text-[1.65rem] font-light leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                      {trainer.name}
                    </h1>
                    {trainer.verified ? (
                      <span
                        className="profile-verified-badge"
                        title="Verified specialist"
                      >
                        <ShieldCheckIcon className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    ) : null}
                    {ranking ? <ProfileRankBadge ranking={ranking} /> : null}
                  </div>
                  <p className="mt-1.5 text-[15px] font-medium text-[rgba(var(--aurora-lavender-rgb),0.92)] sm:text-base">
                    {trainer.profession}
                  </p>
                  <p className="mt-0.5 text-sm text-silver-300">{trainer.title}</p>
                  <p className="mt-1 text-sm text-silver-400">
                    {formatProviderLocation(trainer)}
                  </p>
                </div>
              </div>

              {heroLine ? (
                <p className="profile-hero__tagline">{heroLine}</p>
              ) : null}

              <div className="profile-hero__meta mt-3.5 text-sm sm:mt-4">
                <div className="profile-hero__meta-primary">
                  <ProfileReviewMeta trainer={trainer} />
                  <SessionPrice
                    amount={trainer.pricePerSession}
                    variant="hero"
                    className="profile-hero__meta-price shrink-0"
                  />
                </div>
                {hasGallery ? (
                  <button
                    type="button"
                    className="profile-hero__view-gallery"
                    onClick={() => galleryControlRef.current?.openGallery()}
                  >
                    View Gallery
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="profile-hero__content relative px-4 pb-5 sm:px-6 sm:pb-7 lg:pb-8">
          <div className="mx-auto max-w-7xl">
            <TrainerMarketValueCard trainer={trainer} />
          </div>
        </div>
      </section>
      <ProfileHeroToolbar
        trainerId={trainer.id}
        trainerName={trainer.name}
      />
    </>
  );
}

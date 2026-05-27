"use client";

import { useRef } from "react";
import type { Trainer } from "@/types";
import { getTrainerCityRanking } from "@/data/city-rankings";
import { formatProviderLocation } from "@/lib/provider-location";
import {
  buildTrainerGalleryImages,
  getProfileGalleryMedia,
} from "@/lib/trainer-gallery";
import { formatPrice } from "@/lib/utils";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { ProfileHeroBio } from "./ProfileHeroBio";
import {
  ProfileHeroCoverGallery,
  type ProfileHeroGalleryControl,
} from "./ProfileHeroCoverGallery";
import { TrainerMarketValueCard } from "./TrainerMarketValueCard";
import { ProfileHeroToolbar } from "./ProfileHeroToolbar";
import { ProfileRankBadge } from "./ProfileRankBadge";
import { ProfileResultsSnapshot } from "./ProfileResultsSnapshot";
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

  return (
    <>
      <section className="profile-hero relative w-full overflow-hidden">
      <div className="profile-hero__stage relative h-[58vh] min-h-[380px] w-full sm:h-[54vh] sm:min-h-[420px] lg:h-[58vh]">
        <ProfileHeroCoverGallery
          images={coverImages}
          media={galleryMedia}
          trainerName={trainer.name}
          fallbackHeroImage={trainer.heroImage}
          galleryControlRef={galleryControlRef}
        />
        <div className="profile-hero__scrim profile-hero__scrim--top absolute inset-x-0 top-0 z-[1] h-[42%]" aria-hidden />
        <div className="profile-hero__scrim absolute inset-0 z-[1]" aria-hidden />
        <div className="profile-hero__scrim-fade absolute inset-x-0 bottom-0 z-[1] h-[70%]" aria-hidden />

        <div className="profile-hero__identity absolute inset-x-0 bottom-0 z-10 px-4 pb-5 sm:px-6 sm:pb-7">
          {hasGallery ? (
            <button
              type="button"
              className="profile-hero__view-gallery"
              onClick={() => galleryControlRef.current?.openGallery()}
            >
              View Gallery
            </button>
          ) : null}
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

            <div className="profile-hero__meta mt-4 flex items-end gap-3 text-sm sm:mt-5">
              <ProfileReviewMeta trainer={trainer} />
              <span className="profile-hero__meta-divider shrink-0 text-silver-500" aria-hidden>
                ·
              </span>
              <span className="shrink-0 whitespace-nowrap pb-0.5 font-medium text-white">
                {formatPrice(trainer.pricePerSession)}
                <span className="font-normal text-silver-400"> / session</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-hero__content relative px-4 pb-8 sm:px-6 sm:pb-10 lg:pb-12">
        <div className="mx-auto max-w-7xl">
          <ProfileHeroBio bio={trainer.bio} />
          <TrainerMarketValueCard trainer={trainer} />
          <ProfileResultsSnapshot trainer={trainer} embedded />
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

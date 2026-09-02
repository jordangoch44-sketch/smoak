"use client";

import { useCallback, useState, type CSSProperties, type MouseEvent } from "react";
import type { Trainer } from "@/types";
import type { TrainerCityRanking } from "@/data/city-rankings";
import { formatProviderLocation } from "@/lib/provider-location";
import {
  buildTrainerGalleryImages,
  getProfileGalleryMedia,
  resolveGalleryIndexForUrl,
} from "@/lib/trainer-gallery";
import { normalizePinnedPhotos } from "@/lib/specialist-media-limits";
import { isTrainerProPlus } from "@/lib/specialist-premium";
import {
  getProfileAccentRgb,
  normalizeProfileStyle,
} from "@/lib/specialist-profile-style";
import { isTrainerVerified } from "@/lib/trainer-sponsorship";
import { SessionPrice } from "@/components/ui/SessionPrice";
import { VerifiedBadgeMark } from "@/components/ui/VerifiedBadgeMark";
import { TrainerDistanceLabel } from "@/components/trainers/TrainerDistanceLabel";
import { TrainerProfessionLabel } from "@/components/trainers/TrainerProfessionLabel";
import { PhotosStackIcon } from "@/components/ui/icons";
import { ProfileHeroCoverGallery } from "./ProfileHeroCoverGallery";
import { ProfileHeroAvatar } from "./ProfileHeroAvatar";
import { ProfileHeroBio } from "./ProfileHeroBio";
import { ProfileGalleryModal } from "./ProfileGalleryModal";
import { ProfileHeroToolbar } from "./ProfileHeroToolbar";
import { ProfileHeroTransformations } from "./ProfileHeroTransformations";
import { ProfileRankBadge } from "./ProfileRankBadge";
import { ProfileReviewMeta } from "./ProfileReviewMeta";
import type { SpecialistReviewAggregate } from "@/lib/reviews/specialist-review-types";
import { cn } from "@/lib/utils";

interface ProfileHeroProps {
  trainer: Trainer;
  smoacAggregate?: SpecialistReviewAggregate | null;
  cityRanking?: TrainerCityRanking | null;
  canLeaveReview?: boolean;
  hasOwnReview?: boolean;
  onLeaveReview?: () => void;
  /** Specialist Live tab — same look, no client toolbar / review actions */
  variant?: "public" | "specialist-live";
  /** Live tab — Edit chip on the circular profile photo */
  onEditProfilePhoto?: () => void;
}

export function ProfileHero({
  trainer,
  smoacAggregate,
  cityRanking = null,
  canLeaveReview,
  hasOwnReview,
  onLeaveReview,
  variant = "public",
  onEditProfilePhoto,
}: ProfileHeroProps) {
  const isSpecialistLive = variant === "specialist-live";
  const ranking = cityRanking;
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
  const pinnedPhotos =
    trainer.isPremium === true
      ? normalizePinnedPhotos(trainer.pinnedPhotos, coverImages)
      : [];
  const transformationPhotos = isTrainerProPlus(trainer)
    ? (trainer.clientTransformations ?? []).filter(
        (photo) => typeof photo?.src === "string" && photo.src.trim().length > 0
      )
    : [];
  const transformationMedia = transformationPhotos.map((photo) => ({
    id: photo.id,
    type: "image" as const,
    url: photo.src,
    alt: photo.alt,
  }));
  const pinnedPhotoSet = new Set(pinnedPhotos);
  const remainingGalleryPhotos = galleryMedia.filter(
    (item) => item.type === "image" && !pinnedPhotoSet.has(item.url)
  );
  const remainingPhotoCount = remainingGalleryPhotos.length;
  const firstRemainingPhotoUrl = remainingGalleryPhotos[0]?.url;
  const showMetaGalleryButton =
    remainingPhotoCount > 0 && pinnedPhotos.length === 0;
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [transformOpen, setTransformOpen] = useState(false);
  const [transformIndex, setTransformIndex] = useState(0);
  const bio = typeof trainer.bio === "string" ? trainer.bio.trim() : "";

  const openGallery = useCallback(
    (event: MouseEvent<HTMLButtonElement>, startUrl?: string) => {
      event.preventDefault();
      event.stopPropagation();
      setGalleryIndex(
        startUrl
          ? resolveGalleryIndexForUrl(galleryMedia, startUrl)
          : 0
      );
      setGalleryOpen(true);
    },
    [galleryMedia]
  );

  const closeGallery = useCallback(() => {
    setGalleryOpen(false);
  }, []);

  const style = normalizeProfileStyle(trainer.profileStyle);
  const accentRgb = getProfileAccentRgb(style.accent);
  const styleVars = {
    "--profile-accent-rgb": accentRgb,
  } as CSSProperties;

  return (
    <>
      <section
        className={cn(
          "profile-hero relative w-full",
          `profile-hero--accent-${style.accent}`,
          `profile-hero--font-${style.nameFont}`
        )}
        style={styleVars}
        data-profile-accent={style.accent}
        data-profile-name-font={style.nameFont}
      >
        <div className="profile-hero__stage relative w-full">
          <ProfileHeroCoverGallery
            images={coverImages}
            trainerName={trainer.name}
            fallbackHeroImage={trainer.heroImage}
            slideshowFrames={trainer.gallerySlideshowFrames}
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
                  frame={style.avatarFrame}
                  onEdit={
                    isSpecialistLive && onEditProfilePhoto
                      ? onEditProfilePhoto
                      : undefined
                  }
                  rankBadge={
                    ranking ? (
                      <ProfileRankBadge ranking={ranking} placement="avatar" />
                    ) : null
                  }
                />
                <div className="profile-hero__identity-copy min-w-0 flex-1">
                  <div className="profile-hero__name-row">
                    {isTrainerVerified(trainer) ? (
                      <VerifiedBadgeMark
                        className="profile-verified-mark"
                        iconClassName="profile-verified-mark__icon"
                      />
                    ) : null}
                    <h1
                      className={cn(
                        "profile-hero__name",
                        `profile-hero__name--font-${style.nameFont}`
                      )}
                    >
                      {trainer.name}
                    </h1>
                  </div>
                  <TrainerProfessionLabel
                    trainer={trainer}
                    className="profile-hero__profession"
                  />
                  <p className="profile-hero__location">
                    {formatProviderLocation(trainer)}
                  </p>
                  {isSpecialistLive ? null : (
                    <TrainerDistanceLabel
                      trainer={trainer}
                      className="profile-hero__distance"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-hero__content relative px-4 pb-5 sm:px-6 sm:pb-7 lg:pb-8">
          <div className="mx-auto max-w-7xl">
            {bio ? (
              <div className="profile-hero__intro">
                <ProfileHeroBio bio={bio} />
              </div>
            ) : null}

            {isSpecialistLive ? (
              showMetaGalleryButton ? (
                <div className="profile-hero__meta">
                  <button
                    type="button"
                    className="profile-hero__view-gallery"
                    aria-label="View specialist gallery"
                    onClick={(event) => openGallery(event)}
                  >
                    <PhotosStackIcon className="profile-hero__view-gallery-icon" />
                    View Gallery
                  </button>
                </div>
              ) : null
            ) : (
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
                {showMetaGalleryButton ? (
                  <button
                    type="button"
                    className="profile-hero__view-gallery"
                    aria-label="View specialist gallery"
                    onClick={(event) => openGallery(event)}
                  >
                    <PhotosStackIcon className="profile-hero__view-gallery-icon" />
                    View Gallery
                  </button>
                ) : null}
              </div>
            )}

            {pinnedPhotos.length > 0 ? (
              <div
                className={cn(
                  "profile-hero__pinned",
                  remainingPhotoCount > 0 && "profile-hero__pinned--with-more"
                )}
                aria-label="Pinned photos"
              >
                {pinnedPhotos.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    className="profile-hero__pinned-tile"
                    aria-label={`Open pinned photo ${index + 1}`}
                    onClick={(event) => openGallery(event, url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" />
                  </button>
                ))}
                {remainingPhotoCount > 0 ? (
                  <button
                    type="button"
                    className="smoac-control profile-hero__more-photos"
                    aria-label={`View ${remainingPhotoCount} more ${
                      remainingPhotoCount === 1 ? "photo" : "photos"
                    }`}
                    onClick={(event) =>
                      openGallery(event, firstRemainingPhotoUrl)
                    }
                  >
                    <PhotosStackIcon className="profile-hero__more-photos-icon" />
                    <span className="profile-hero__more-photos-count">
                      +{remainingPhotoCount}
                    </span>
                  </button>
                ) : null}
              </div>
            ) : null}

            {transformationPhotos.length > 0 ? (
              <ProfileHeroTransformations
                photos={transformationPhotos}
                onOpen={(event, src) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const index = transformationPhotos.findIndex(
                    (photo) => photo.src === src
                  );
                  setTransformIndex(index >= 0 ? index : 0);
                  setTransformOpen(true);
                }}
              />
            ) : null}
          </div>
        </div>
      </section>

      <ProfileGalleryModal
        open={galleryOpen}
        media={galleryMedia}
        initialIndex={galleryIndex}
        trainerName={trainer.name}
        onClose={closeGallery}
      />
      <ProfileGalleryModal
        open={transformOpen}
        media={transformationMedia}
        initialIndex={transformIndex}
        trainerName={`${trainer.name} transformations`}
        onClose={() => setTransformOpen(false)}
      />

      {isSpecialistLive ? null : (
        <ProfileHeroToolbar
          trainerId={trainer.id}
          trainerName={trainer.name}
          instagram={trainer.social?.instagram}
        />
      )}
    </>
  );
}

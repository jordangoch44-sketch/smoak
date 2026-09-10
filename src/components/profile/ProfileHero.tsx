"use client";

import { useCallback, useState, type CSSProperties } from "react";
import type { Trainer } from "@/types";
import type { TrainerCityRanking } from "@/data/city-rankings";
import { formatProviderLocation } from "@/lib/provider-location";
import {
  buildTrainerGalleryImages,
  getProfileGalleryMedia,
  resolveGalleryIndexForUrl,
  resolveGalleryItemForUrl,
} from "@/lib/trainer-gallery";
import { formatClipSecondsLabel } from "@/lib/media/video-file";
import {
  normalizePinnedPhotos,
  pinAllowList,
} from "@/lib/specialist-media-limits";
import { isTrainerProPlus } from "@/lib/specialist-premium";
import {
  getProfileAccentRgb,
  normalizeProfileStyle,
} from "@/lib/specialist-profile-style";
import { isTrainerVerified } from "@/lib/trainer-sponsorship";
import { SessionPrice } from "@/components/ui/SessionPrice";
import { VerifiedBadgeMark } from "@/components/ui/VerifiedBadgeMark";
import {
  FREE_FIRST_SESSION_CLAIM_LABEL,
  isTrainerFreeFirstSessionEligible,
} from "@/lib/free-first-session";
import { TrainerDistanceLabel } from "@/components/trainers/TrainerDistanceLabel";
import { TrainerProfessionLabel } from "@/components/trainers/TrainerProfessionLabel";
import { CalendarIcon, PhotosStackIcon } from "@/components/ui/icons";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { MEDIA_TAP_SLOP_PX } from "@/hooks/useFastActivate";
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
  /** Specialist Live tab — same client profile, minus toolbar / leave-review / distance */
  variant?: "public" | "specialist-live";
  /** Live tab — Edit chip on the circular profile photo */
  onEditProfilePhoto?: () => void;
  /** Public profile — claim CTA opens inquire */
  onClaimFreeSession?: () => void;
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
  onClaimFreeSession,
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
  const canShowPins =
    trainer.isPremium === true || isTrainerProPlus(trainer);
  const pinVideos = galleryMedia
    .filter((item) => item.type === "video")
    .map((item) => item.url);
  const pinnedPhotos = canShowPins
    ? normalizePinnedPhotos(
        trainer.pinnedPhotos,
        pinAllowList(coverImages, pinVideos)
      )
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
    (startUrl?: string) => {
      setGalleryIndex(
        startUrl ? resolveGalleryIndexForUrl(galleryMedia, startUrl) : 0
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
            <div className="mx-auto max-w-7xl profile-hero__identity-inner px-4 sm:px-6">
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
                      showIcon
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

            <div className="profile-hero__meta">
              <div className="profile-hero__meta-primary">
                <ProfileReviewMeta
                  trainer={trainer}
                  smoacAggregate={smoacAggregate}
                  canLeaveReview={isSpecialistLive ? false : canLeaveReview}
                  hasOwnReview={isSpecialistLive ? false : hasOwnReview}
                  onLeaveReview={isSpecialistLive ? undefined : onLeaveReview}
                />
                <div className="profile-hero__meta-offer">
                  <SessionPrice
                    trainer={trainer}
                    variant="hero"
                    className="profile-hero__meta-price shrink-0"
                  />
                  {isTrainerFreeFirstSessionEligible(trainer) ? (
                    onClaimFreeSession ? (
                      <FastActivateButton
                        className="smoac-control profile-hero__free-session"
                        onActivate={onClaimFreeSession}
                      >
                        <CalendarIcon className="profile-hero__free-session-icon" />
                        <span className="profile-hero__free-session-label">
                          {FREE_FIRST_SESSION_CLAIM_LABEL}
                        </span>
                      </FastActivateButton>
                    ) : (
                      <span className="profile-hero__free-session">
                        <CalendarIcon className="profile-hero__free-session-icon" />
                        <span className="profile-hero__free-session-label">
                          {FREE_FIRST_SESSION_CLAIM_LABEL}
                        </span>
                      </span>
                    )
                  ) : null}
                </div>
              </div>
              {showMetaGalleryButton ? (
                <FastActivateButton
                  className="profile-hero__view-gallery"
                  aria-label="View specialist gallery"
                  onActivate={() => openGallery()}
                >
                  <PhotosStackIcon className="profile-hero__view-gallery-icon" />
                  View Gallery
                </FastActivateButton>
              ) : null}
            </div>

            {pinnedPhotos.length > 0 ? (
              <div
                className={cn(
                  "profile-hero__pinned",
                  remainingPhotoCount > 0 && "profile-hero__pinned--with-more"
                )}
                aria-label="Pinned photos and videos"
              >
                {pinnedPhotos.map((url, index) => {
                  const item = resolveGalleryItemForUrl(galleryMedia, url);
                  const isVideo = item?.type === "video";
                  const preview = isVideo ? item.thumbnail || "" : url;
                  return (
                    <FastActivateButton
                      key={url}
                      className="profile-hero__pinned-tile"
                      aria-label={
                        isVideo
                          ? `Play pinned video ${index + 1}`
                          : `Open pinned photo ${index + 1}`
                      }
                      slopPx={MEDIA_TAP_SLOP_PX}
                      onActivate={() => openGallery(url)}
                    >
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="" />
                      ) : null}
                      {isVideo ? (
                        <span className="profile-hero__pinned-seconds">
                          {formatClipSecondsLabel(item.duration ?? 0)}
                        </span>
                      ) : null}
                    </FastActivateButton>
                  );
                })}
                {remainingPhotoCount > 0 ? (
                  <FastActivateButton
                    className="smoac-control profile-hero__more-photos"
                    aria-label={`View ${remainingPhotoCount} more ${
                      remainingPhotoCount === 1 ? "photo" : "photos"
                    }`}
                    slopPx={MEDIA_TAP_SLOP_PX}
                    onActivate={() => openGallery(firstRemainingPhotoUrl)}
                  >
                    <PhotosStackIcon className="profile-hero__more-photos-icon" />
                    <span className="profile-hero__more-photos-count">
                      +{remainingPhotoCount}
                    </span>
                  </FastActivateButton>
                ) : null}
              </div>
            ) : null}

            {transformationPhotos.length > 0 ? (
              <ProfileHeroTransformations
                photos={transformationPhotos}
                onOpen={(src) => {
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
          slug={trainer.slug}
          instagram={trainer.social?.instagram}
        />
      )}
    </>
  );
}

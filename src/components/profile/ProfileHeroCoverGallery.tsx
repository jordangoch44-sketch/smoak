"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { useProfileHeroCoverGallery } from "@/hooks/useProfileHeroCoverGallery";
import { resolveGalleryIndexForCover } from "@/lib/trainer-gallery";
import type { ProfileGalleryMedia } from "@/types/profile-gallery";
import { ProfileGalleryModal } from "./ProfileGalleryModal";
import { cn } from "@/lib/utils";

export interface ProfileHeroGalleryControl {
  openGallery: () => void;
}

interface ProfileHeroCoverGalleryProps {
  images: string[];
  media: ProfileGalleryMedia[];
  trainerName: string;
  fallbackHeroImage: string;
  galleryControlRef?: MutableRefObject<ProfileHeroGalleryControl | null>;
}

function CoverNavChevron({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      className="profile-hero-cover__chevron"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d={direction === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProfileHeroCoverGallery({
  images,
  media,
  trainerName,
  fallbackHeroImage,
  galleryControlRef,
}: ProfileHeroCoverGalleryProps) {
  const slides = useMemo(
    () =>
      images.length > 0 ? images : fallbackHeroImage ? [fallbackHeroImage] : [],
    [images, fallbackHeroImage]
  );

  const [engaged, setEngaged] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const disengageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showViewGallery = media.length > 0;

  const {
    index,
    canSlide,
    goNext,
    goPrev,
    registerInteraction,
    onTouchStart,
    onTouchEnd,
  } = useProfileHeroCoverGallery({ imageCount: slides.length });

  const markEngaged = useCallback(() => {
    if (disengageTimerRef.current) {
      clearTimeout(disengageTimerRef.current);
      disengageTimerRef.current = null;
    }
    setEngaged(true);
  }, []);

  const scheduleDisengage = useCallback(() => {
    if (galleryOpen) return;
    if (disengageTimerRef.current) clearTimeout(disengageTimerRef.current);
    disengageTimerRef.current = setTimeout(() => {
      setEngaged(false);
      disengageTimerRef.current = null;
    }, 2400);
  }, [galleryOpen]);

  const handleHeroTap = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).closest("button")) return;
      markEngaged();
      scheduleDisengage();
    },
    [markEngaged, scheduleDisengage]
  );

  const handleTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLElement>) => {
      markEngaged();
      onTouchStart(event);
    },
    [markEngaged, onTouchStart]
  );

  const handleTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLElement>) => {
      onTouchEnd(event);
      scheduleDisengage();
    },
    [onTouchEnd, scheduleDisengage]
  );

  const openGallery = useCallback(() => {
    setGalleryStartIndex(
      resolveGalleryIndexForCover(media, slides, index)
    );
    setGalleryOpen(true);
    if (disengageTimerRef.current) {
      clearTimeout(disengageTimerRef.current);
      disengageTimerRef.current = null;
    }
  }, [media, slides, index]);

  useEffect(() => {
    if (!galleryControlRef) return;
    galleryControlRef.current = { openGallery };
    return () => {
      galleryControlRef.current = null;
    };
  }, [galleryControlRef, openGallery]);

  const closeGallery = useCallback(() => {
    setGalleryOpen(false);
    scheduleDisengage();
  }, [scheduleDisengage]);

  if (slides.length === 0) {
    return (
      <TrainerThumbnail
        src={fallbackHeroImage}
        name={trainerName}
        size="hero"
        priority
        className="profile-hero__media absolute inset-0 z-0"
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          "profile-hero-cover absolute inset-0 z-0",
          engaged && "profile-hero-cover--engaged"
        )}
        onClick={handleHeroTap}
        onPointerEnter={markEngaged}
        onPointerLeave={scheduleDisengage}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-roledescription={canSlide ? "carousel" : undefined}
        aria-label={`${trainerName} photos`}
      >
        <div className="profile-hero-cover__track">
          {slides.map((src, slideIndex) => (
            <div
              key={`${src}-${slideIndex}`}
              className={cn(
                "profile-hero-cover__slide",
                slideIndex === index && "profile-hero-cover__slide--active"
              )}
              aria-hidden={slideIndex !== index}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                priority={slideIndex === 0}
              />
            </div>
          ))}
        </div>

        {canSlide ? (
          <div className="profile-hero-cover__nav-rail" aria-hidden>
            <button
              type="button"
              className="profile-hero-cover__nav profile-hero-cover__nav--prev"
              aria-label="Previous photo"
              onClick={(event) => {
                event.stopPropagation();
                markEngaged();
                registerInteraction();
                goPrev();
                scheduleDisengage();
              }}
            >
              <CoverNavChevron direction="prev" />
            </button>
            <button
              type="button"
              className="profile-hero-cover__nav profile-hero-cover__nav--next"
              aria-label="Next photo"
              onClick={(event) => {
                event.stopPropagation();
                markEngaged();
                registerInteraction();
                goNext();
                scheduleDisengage();
              }}
            >
              <CoverNavChevron direction="next" />
            </button>
          </div>
        ) : null}

      </div>

      {showViewGallery ? (
        <ProfileGalleryModal
          open={galleryOpen}
          media={media}
          initialIndex={galleryStartIndex}
          trainerName={trainerName}
          onClose={closeGallery}
        />
      ) : null}
    </>
  );
}

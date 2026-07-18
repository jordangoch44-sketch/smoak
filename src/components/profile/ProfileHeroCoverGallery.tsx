"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MutableRefObject,
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

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  const showViewGallery = media.length > 0;

  const { index, canSlide, onTouchStart, onTouchEnd } = useProfileHeroCoverGallery({
    imageCount: slides.length,
  });

  const preloadGalleryImage = useCallback((url: string) => {
    return new Promise<void>((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
  }, []);

  const openGallery = useCallback(() => {
    const startIndex = resolveGalleryIndexForCover(media, slides, index);
    setGalleryStartIndex(startIndex);
    setGalleryOpen(true);

    /* Prefetch in the background — do not delay opening (felt broken when
     * the gallery was also stacked under the profile sheet). */
    const item = media[startIndex];
    if (item) {
      const preloadUrl =
        item.type === "image" ? item.url : item.thumbnail ?? item.url;
      void preloadGalleryImage(preloadUrl);
    }
  }, [index, media, preloadGalleryImage, slides]);

  useEffect(() => {
    if (!galleryControlRef) return;
    galleryControlRef.current = { openGallery };
    return () => {
      galleryControlRef.current = null;
    };
  }, [galleryControlRef, openGallery]);

  const closeGallery = useCallback(() => {
    setGalleryOpen(false);
  }, []);

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
        className="profile-hero-cover absolute inset-0 z-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
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

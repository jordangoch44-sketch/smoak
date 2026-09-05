"use client";

import Image from "next/image";
import { useMemo } from "react";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { useProfileHeroCoverGallery } from "@/hooks/useProfileHeroCoverGallery";
import { cn } from "@/lib/utils";

import {
  resolveSlideshowFrame,
  slideshowFrameToImageStyle,
  type SlideshowFrameMap,
} from "@/lib/media/slideshow-frame";

interface ProfileHeroCoverGalleryProps {
  images: string[];
  trainerName: string;
  fallbackHeroImage: string;
  slideshowFrames?: SlideshowFrameMap;
}

/** Cover slideshow only — gallery lightbox is owned by ProfileHero. */
export function ProfileHeroCoverGallery({
  images,
  trainerName,
  fallbackHeroImage,
  slideshowFrames,
}: ProfileHeroCoverGalleryProps) {
  const slides = useMemo(
    () =>
      images.length > 0
        ? images
        : fallbackHeroImage.trim()
          ? [fallbackHeroImage]
          : [],
    [images, fallbackHeroImage]
  );

  const { index, canSlide, onTouchStart, onTouchEnd } = useProfileHeroCoverGallery({
    imageCount: slides.length,
  });

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
    <div
      className="profile-hero-cover absolute inset-0 z-0"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription={canSlide ? "carousel" : undefined}
      aria-label={`${trainerName} photos`}
    >
      <div className="profile-hero-cover__track">
        {slides.map((src, slideIndex) => {
          const isActive = slideIndex === index;
          const isNeighbor =
            canSlide &&
            (slideIndex === (index + slides.length - 1) % slides.length ||
              slideIndex === (index + 1) % slides.length);
          if (!isActive && !isNeighbor) return null;

          return (
            <div
              key={`${src}-${slideIndex}`}
              className={cn(
                "profile-hero-cover__slide",
                isActive && "profile-hero-cover__slide--active"
              )}
              aria-hidden={!isActive}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                style={slideshowFrameToImageStyle(
                  resolveSlideshowFrame(slideshowFrames ?? {}, src)
                )}
                priority={slideIndex === 0}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

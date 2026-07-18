"use client";

import Image from "next/image";
import { useMemo } from "react";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { useProfileHeroCoverGallery } from "@/hooks/useProfileHeroCoverGallery";
import { cn } from "@/lib/utils";

interface ProfileHeroCoverGalleryProps {
  images: string[];
  trainerName: string;
  fallbackHeroImage: string;
}

/** Cover slideshow only — gallery lightbox is owned by ProfileHero. */
export function ProfileHeroCoverGallery({
  images,
  trainerName,
  fallbackHeroImage,
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
  );
}

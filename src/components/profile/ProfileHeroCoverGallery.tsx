"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { useProfileHeroCoverGallery } from "@/hooks/useProfileHeroCoverGallery";
import { cn } from "@/lib/utils";

import {
  resolveSlideshowFrame,
  slideshowFrameToImageStyle,
  type SlideshowFrameMap,
} from "@/lib/media/slideshow-frame";

export interface ProfileHeroCoverSlide {
  type: "image" | "video";
  src: string;
  poster?: string;
}

interface ProfileHeroCoverGalleryProps {
  slides: ProfileHeroCoverSlide[];
  trainerName: string;
  fallbackHeroImage: string;
  slideshowFrames?: SlideshowFrameMap;
}

function CoverSlideVideo({
  src,
  poster,
  loop,
  onPlaying,
  onEnded,
}: {
  src: string;
  poster?: string;
  loop: boolean;
  onPlaying: () => void;
  onEnded: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    const play = video.play();
    if (play) play.catch(() => {});
    return () => {
      video.pause();
    };
  }, [src]);

  return (
    <video
      ref={ref}
      className="profile-hero-cover__video"
      src={src}
      poster={poster || undefined}
      playsInline
      muted
      autoPlay
      loop={loop}
      preload="auto"
      onPlaying={onPlaying}
      onEnded={onEnded}
    />
  );
}

/** Cover slideshow only — gallery lightbox is owned by ProfileHero. */
export function ProfileHeroCoverGallery({
  slides: slideInput,
  trainerName,
  fallbackHeroImage,
  slideshowFrames,
}: ProfileHeroCoverGalleryProps) {
  const slides = useMemo(() => {
    const list = slideInput.filter((slide) => slide.src.trim().length > 0);
    if (list.length > 0) return list;
    return fallbackHeroImage.trim()
      ? [{ type: "image" as const, src: fallbackHeroImage }]
      : [];
  }, [slideInput, fallbackHeroImage]);

  const [videoHolding, setVideoHolding] = useState(false);
  const { index, canSlide, goNext, onTouchStart, onTouchEnd } =
    useProfileHeroCoverGallery({
      imageCount: slides.length,
      holdAutoplay: videoHolding,
    });

  useEffect(() => {
    setVideoHolding(false);
  }, [index]);

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
      aria-label={
        slides.some((slide) => slide.type === "video")
          ? `${trainerName} photos and videos`
          : `${trainerName} photos`
      }
    >
      <div className="profile-hero-cover__track">
        {slides.map((slide, slideIndex) => {
          const isActive = slideIndex === index;
          const isNeighbor =
            canSlide &&
            (slideIndex === (index + slides.length - 1) % slides.length ||
              slideIndex === (index + 1) % slides.length);
          if (!isActive && !isNeighbor) return null;

          const still =
            slide.type === "video" ? slide.poster?.trim() || "" : slide.src;

          return (
            <div
              key={`${slide.src}-${slideIndex}`}
              className={cn(
                "profile-hero-cover__slide",
                isActive && "profile-hero-cover__slide--active"
              )}
              aria-hidden={!isActive}
            >
              {slide.type === "video" && isActive ? (
                <CoverSlideVideo
                  src={slide.src}
                  poster={still}
                  loop={!canSlide}
                  onPlaying={() => setVideoHolding(true)}
                  onEnded={() => {
                    setVideoHolding(false);
                    if (canSlide) goNext();
                  }}
                />
              ) : still ? (
                <Image
                  src={still}
                  alt=""
                  fill
                  sizes="100vw"
                  className="object-cover"
                  style={{
                    objectFit: "cover",
                    ...slideshowFrameToImageStyle(
                      resolveSlideshowFrame(slideshowFrames ?? {}, still)
                    ),
                  }}
                  priority={slideIndex === 0}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

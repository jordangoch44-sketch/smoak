"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useCarousel } from "@/hooks/useCarousel";
import {
  ProfileCarouselControls,
  ProfileCarouselNav,
} from "./ProfileCarouselControls";
import type { TrainerMediaItem } from "@/types";

interface ProfileMediaSliderProps {
  items: TrainerMediaItem[];
}

export function ProfileMediaSlider({ items }: ProfileMediaSliderProps) {
  const { index, goTo, count } = useCarousel(items.length);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const current = items[index];

  function goToSlide(next: number) {
    setVideoPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    goTo(next);
  }

  function handlePlayVideo() {
    const video = videoRef.current;
    if (!video) return;
    void video.play();
    setVideoPlaying(true);
  }

  if (count === 0) return null;

  return (
    <div className="profile-hero__gallery" aria-label="Photos and videos">
      <div className="profile-media-slider">
        <div className="profile-media-slider__header">
          <p className="profile-hero__stats-label">Gallery</p>
          <span className="profile-carousel__count">
            {index + 1} / {count}
          </span>
        </div>

        <div className="profile-media-slider__frame">
          {current.type === "image" ? (
            <Image
              key={current.id}
              src={current.src}
              alt={current.alt}
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-cover"
              priority={index === 0}
            />
          ) : (
            <>
              <video
                ref={videoRef}
                key={current.id}
                className="profile-media-slider__video"
                src={current.src}
                poster={current.poster}
                playsInline
                preload="metadata"
                onEnded={() => setVideoPlaying(false)}
                onPause={() => setVideoPlaying(false)}
                onPlay={() => setVideoPlaying(true)}
              />
              {!videoPlaying && (
                <button
                  type="button"
                  onClick={handlePlayVideo}
                  className="profile-media-slider__play"
                  aria-label={`Play ${current.alt}`}
                >
                  <span className="profile-media-slider__play-icon" aria-hidden>
                    ▶
                  </span>
                </button>
              )}
              <span className="profile-media-slider__badge">Video</span>
            </>
          )}

          <ProfileCarouselNav
            onPrev={() => goToSlide(index - 1)}
            onNext={() => goToSlide(index + 1)}
            prevLabel="Previous slide"
            nextLabel="Next slide"
          />
        </div>

        <ProfileCarouselControls
          index={index}
          count={count}
          onSelect={goToSlide}
          dotsLabel="Gallery slides"
          getDotLabel={(i) => `Slide ${i + 1}: ${items[i].alt}`}
          caption={current.alt}
        />
      </div>
    </div>
  );
}

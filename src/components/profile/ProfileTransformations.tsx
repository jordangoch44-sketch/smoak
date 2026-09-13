"use client";

import { useCallback, useRef, useState } from "react";
import type { Trainer } from "@/types";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { TAP_SLOP_PX } from "@/hooks/useFastActivate";
import { isTrainerProPlus } from "@/lib/specialist-premium";
import { cn } from "@/lib/utils";
import { ProfileGalleryModal } from "./ProfileGalleryModal";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface ProfileTransformationsProps {
  trainer: Trainer;
}

function padIndex(value: number, total: number): string {
  const width = String(total).length;
  return String(value).padStart(Math.max(width, 2), "0");
}

export function ProfileTransformations({ trainer }: ProfileTransformationsProps) {
  const photos = isTrainerProPlus(trainer)
    ? (trainer.clientTransformations ?? []).filter(
        (photo) => typeof photo?.src === "string" && photo.src.trim().length > 0
      )
    : [];
  const count = photos.length;
  const canSlide = count > 1;
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const media = photos.map((photo) => ({
    id: photo.id || photo.src,
    type: "image" as const,
    url: photo.src,
    alt: photo.alt,
  }));

  const syncActiveFromScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || count === 0) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const center = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const mid = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(mid - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    setActiveIndex(best);
  }, [count]);

  const scrollToIndex = useCallback((next: number) => {
    const track = trackRef.current;
    const card = track?.children[next] as HTMLElement | undefined;
    if (!track || !card) return;
    track.scrollTo({
      left: card.offsetLeft,
      behavior: "smooth",
    });
  }, []);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  if (count === 0) return null;

  return (
    <>
      <ProfileSection
        variant="panel"
        className="profile-transforms"
        aria-label="Client results"
      >
        <ProfileSectionHeader
          title="Client Results"
          trailing={
            <span className="profile-transforms__count" aria-hidden>
              {padIndex(activeIndex + 1, count)}
              <span className="profile-transforms__count-sep">/</span>
              {padIndex(count, count)}
            </span>
          }
        />
        <div className="profile-transforms__body">
          <div className="profile-transforms__stage">
            {canSlide ? (
              <>
                <FastActivateButton
                  className="smoac-control profile-transforms__nav profile-transforms__nav--prev"
                  aria-label="Previous client result"
                  disabled={activeIndex === 0}
                  onActivate={() => scrollToIndex(Math.max(0, activeIndex - 1))}
                >
                  <ChevronLeftIcon className="profile-transforms__nav-icon" />
                </FastActivateButton>
                <FastActivateButton
                  className="smoac-control profile-transforms__nav profile-transforms__nav--next"
                  aria-label="Next client result"
                  disabled={activeIndex === count - 1}
                  onActivate={() =>
                    scrollToIndex(Math.min(count - 1, activeIndex + 1))
                  }
                >
                  <ChevronRightIcon className="profile-transforms__nav-icon" />
                </FastActivateButton>
              </>
            ) : null}
            <div
              ref={trackRef}
              className={cn(
                "profile-transforms__track",
                !canSlide && "profile-transforms__track--single"
              )}
              role="list"
              aria-label="Client result photos"
              aria-roledescription={canSlide ? "carousel" : undefined}
              onScroll={canSlide ? syncActiveFromScroll : undefined}
            >
              {photos.map((photo, index) => (
                <div key={photo.id || photo.src} className="profile-transforms__item" role="listitem">
                  <FastActivateButton
                    className="profile-transforms__slide"
                    aria-label={`Open client result photo ${index + 1} of ${count}`}
                    slopPx={TAP_SLOP_PX}
                    onActivate={() => openLightbox(index)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.src} alt="" />
                    <span className="profile-transforms__slide-sheen" aria-hidden />
                    <span className="profile-transforms__slide-hint">View</span>
                  </FastActivateButton>
                </div>
              ))}
            </div>
          </div>
          {canSlide ? (
            <div className="profile-transforms__dots" aria-hidden>
              {photos.map((photo, index) => (
                <button
                  key={photo.id || photo.src}
                  type="button"
                  tabIndex={-1}
                  className={cn(
                    "profile-transforms__dot",
                    index === activeIndex && "profile-transforms__dot--active"
                  )}
                  onClick={() => scrollToIndex(index)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </ProfileSection>

      <ProfileGalleryModal
        open={lightboxOpen}
        media={media}
        initialIndex={lightboxIndex}
        trainerName={`${trainer.name} client results`}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

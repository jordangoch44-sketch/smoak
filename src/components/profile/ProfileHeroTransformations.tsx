"use client";

import type { ClientTransformationPhoto } from "@/types";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { PhotosStackIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface ProfileHeroTransformationsProps {
  photos: ClientTransformationPhoto[];
  onOpen: (src: string) => void;
}

export function ProfileHeroTransformations({
  photos,
  onOpen,
}: ProfileHeroTransformationsProps) {
  if (photos.length === 0) return null;

  const visible = photos.slice(0, 3);
  const extraCount = photos.length - visible.length;
  const extraStart = photos[3]?.src;

  return (
    <div className="profile-hero__transforms">
      <p className="profile-hero__transforms-label">Client transformations</p>
      <div
        className={cn(
          "profile-hero__pinned",
          extraCount > 0 && "profile-hero__pinned--with-more"
        )}
        aria-label="Client transformation photos"
      >
        {visible.map((photo, index) => (
          <FastActivateButton
            key={photo.id || photo.src}
            className="profile-hero__pinned-tile"
            aria-label={`Open transformation photo ${index + 1}`}
            onActivate={() => onOpen(photo.src)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt="" />
          </FastActivateButton>
        ))}
        {extraCount > 0 && extraStart ? (
          <FastActivateButton
            className="smoac-control profile-hero__more-photos"
            aria-label={`View ${extraCount} more ${
              extraCount === 1 ? "transformation" : "transformations"
            }`}
            onActivate={() => onOpen(extraStart)}
          >
            <PhotosStackIcon className="profile-hero__more-photos-icon" />
            <span className="profile-hero__more-photos-count">
              +{extraCount}
            </span>
          </FastActivateButton>
        ) : null}
      </div>
    </div>
  );
}

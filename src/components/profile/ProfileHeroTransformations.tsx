"use client";

import type { MouseEvent } from "react";
import type { ClientTransformationPhoto } from "@/types";
import { PhotosStackIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface ProfileHeroTransformationsProps {
  photos: ClientTransformationPhoto[];
  onOpen: (event: MouseEvent<HTMLButtonElement>, src: string) => void;
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
          <button
            key={photo.id || photo.src}
            type="button"
            className="profile-hero__pinned-tile"
            aria-label={`Open transformation photo ${index + 1}`}
            onClick={(event) => onOpen(event, photo.src)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt="" />
          </button>
        ))}
        {extraCount > 0 && extraStart ? (
          <button
            type="button"
            className="smoac-control profile-hero__more-photos"
            aria-label={`View ${extraCount} more ${
              extraCount === 1 ? "transformation" : "transformations"
            }`}
            onClick={(event) => onOpen(event, extraStart)}
          >
            <PhotosStackIcon className="profile-hero__more-photos-icon" />
            <span className="profile-hero__more-photos-count">
              +{extraCount}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

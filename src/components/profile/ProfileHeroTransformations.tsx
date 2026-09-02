"use client";

import { useCallback, useRef, type MouseEvent } from "react";
import type { ClientTransformationPhoto } from "@/types";

interface ProfileHeroTransformationsProps {
  photos: ClientTransformationPhoto[];
  onOpen: (event: MouseEvent<HTMLButtonElement>, src: string) => void;
}

export function ProfileHeroTransformations({
  photos,
  onOpen,
}: ProfileHeroTransformationsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByTile = useCallback((direction: -1 | 1) => {
    const root = scrollerRef.current;
    if (!root) return;
    const tile = root.querySelector<HTMLElement>(".profile-hero__pinned-tile");
    const step = (tile?.offsetWidth ?? 88) + 8;
    root.scrollBy({ left: direction * step, behavior: "smooth" });
  }, []);

  if (photos.length === 0) return null;

  return (
    <div className="profile-hero__transforms">
      <div className="profile-hero__transforms-head">
        <p className="profile-hero__transforms-label">Client transformations</p>
        {photos.length > 3 ? (
          <div className="profile-hero__transforms-nav">
            <button
              type="button"
              className="profile-hero__transforms-nav-btn"
              aria-label="Previous transformations"
              onClick={() => scrollByTile(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="profile-hero__transforms-nav-btn"
              aria-label="Next transformations"
              onClick={() => scrollByTile(1)}
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
      <div
        ref={scrollerRef}
        className="profile-hero__transforms-scroller"
        aria-label="Client transformation photos"
      >
        {photos.map((photo, index) => (
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
      </div>
    </div>
  );
}

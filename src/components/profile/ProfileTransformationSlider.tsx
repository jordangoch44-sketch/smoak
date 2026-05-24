"use client";

import Image from "next/image";
import { LOGO_SRC } from "@/lib/brand";
import { useCarousel } from "@/hooks/useCarousel";
import {
  ProfileCarouselControls,
  ProfileCarouselNav,
} from "./ProfileCarouselControls";
import type { ClientTransformationPhoto } from "@/types";

interface ProfileTransformationSliderProps {
  photos: ClientTransformationPhoto[];
}

function TransformationGlassPlaceholder() {
  return (
    <div
      className="profile-transform__placeholder"
      role="img"
      aria-label="Client transformation photos coming soon"
    >
      <div className="profile-transform__glass-base" aria-hidden />
      <div className="profile-transform__glass-grain" aria-hidden />
      <div className="profile-transform__glass-sheen" aria-hidden />
      <div className="profile-transform__glass-etch" aria-hidden>
        <Image
          src={LOGO_SRC}
          alt=""
          width={512}
          height={512}
          unoptimized
          className="profile-transform__etch-shadow"
          sizes="200px"
        />
        <Image
          src={LOGO_SRC}
          alt=""
          width={512}
          height={512}
          unoptimized
          className="profile-transform__etch-logo"
          sizes="200px"
        />
      </div>
    </div>
  );
}

export function ProfileTransformationSlider({
  photos,
}: ProfileTransformationSliderProps) {
  const { index, goTo, count } = useCarousel(photos.length);

  if (count === 0) {
    return <TransformationGlassPlaceholder />;
  }

  const current = photos[index];

  return (
    <div className="profile-transform">
      <div className="profile-transform__frame">
        <Image
          key={current.id}
          src={current.src}
          alt={current.alt}
          fill
          sizes="(max-width: 768px) 100vw, 640px"
          className="object-cover"
          priority={index === 0}
        />

        {count > 1 && (
          <ProfileCarouselNav
            onPrev={() => goTo(index - 1)}
            onNext={() => goTo(index + 1)}
            prevLabel="Previous transformation"
            nextLabel="Next transformation"
          />
        )}
      </div>

      <ProfileCarouselControls
        index={index}
        count={count}
        onSelect={goTo}
        dotsLabel="Transformation slides"
        getDotLabel={(i) => `Transformation ${i + 1}`}
        layout="split"
      />
    </div>
  );
}

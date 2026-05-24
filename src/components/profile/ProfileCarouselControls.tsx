"use client";

import { cn } from "@/lib/utils";

interface ProfileCarouselControlsProps {
  index: number;
  count: number;
  onSelect: (index: number) => void;
  dotsLabel: string;
  /** Slide label for dot buttons */
  getDotLabel?: (index: number) => string;
  caption?: string;
  layout?: "centered" | "split";
}

export function ProfileCarouselNav({
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: {
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onPrev}
        className="profile-carousel__nav profile-carousel__nav--prev"
        aria-label={prevLabel}
      >
        ‹
      </button>
      <button
        type="button"
        onClick={onNext}
        className="profile-carousel__nav profile-carousel__nav--next"
        aria-label={nextLabel}
      >
        ›
      </button>
    </>
  );
}

export function ProfileCarouselControls({
  index,
  count,
  onSelect,
  dotsLabel,
  getDotLabel = (i) => `Slide ${i + 1}`,
  caption,
  layout = "centered",
}: ProfileCarouselControlsProps) {
  if (count <= 1) return null;

  return (
    <div
      className={cn(
        "profile-carousel__footer",
        layout === "split" && "profile-carousel__footer--split"
      )}
    >
      <div
        className="profile-carousel__dots"
        role="tablist"
        aria-label={dotsLabel}
      >
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={getDotLabel(i)}
            onClick={() => onSelect(i)}
            className={cn(
              "profile-carousel__dot",
              i === index && "profile-carousel__dot--active"
            )}
          />
        ))}
      </div>
      {layout === "split" ? (
        <span className="profile-carousel__count">
          {index + 1} / {count}
        </span>
      ) : (
        caption && <p className="profile-carousel__caption">{caption}</p>
      )}
    </div>
  );
}

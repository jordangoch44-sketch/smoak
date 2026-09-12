"use client";

import { GoogleMark } from "@/components/brand/GoogleMark";
import { SmoacStarRating } from "@/components/reviews/SmoacStarRating";
import { resolvePublicGoogleReviewsDisplay } from "@/lib/google-reviews-display";
import { cn } from "@/lib/utils";
import type { Trainer } from "@/types";

interface ProfileGoogleReviewsLinkProps {
  trainer: Trainer;
  /** Compact hero row vs Reviews-tab card that opens the Google listing. */
  variant?: "hero" | "sheet";
}

function GoogleStars({
  reviewCount,
  avgRating,
  className,
  size = "hero",
}: {
  reviewCount: number;
  avgRating: number | null;
  className?: string;
  size?: "hero" | "card";
}) {
  return (
    <SmoacStarRating
      reviewCount={reviewCount}
      avgRating={avgRating}
      sourceName="Google"
      size={size}
      className={className}
    />
  );
}

export function ProfileGoogleReviewsLink({
  trainer,
  variant = "hero",
}: ProfileGoogleReviewsLinkProps) {
  const google = resolvePublicGoogleReviewsDisplay(trainer);

  if (variant === "sheet") {
    if (google.locked || !google.connected || !google.mapsHref) return null;
    return (
      <a
        href={google.mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="smoac-control smoac-google-reviews-link"
        aria-label="Open this specialist's Google Business Profile reviews"
        onClick={(event) => event.stopPropagation()}
      >
        <GoogleMark className="smoac-google-reviews-link__mark" />
        <div className="smoac-google-reviews-link__copy">
          <p className="smoac-google-reviews-link__title">Google Reviews</p>
          <GoogleStars
            reviewCount={google.reviewCount}
            avgRating={google.rating}
            size="card"
            className="smoac-google-reviews-link__stars"
          />
        </div>
        <span className="smoac-google-reviews-link__cta">
          View business profile
        </span>
      </a>
    );
  }

  const googleRow = (
    <>
      <span className="profile-hero__reviews-mark-slot" aria-hidden>
        <GoogleMark className="profile-hero__reviews-mark profile-hero__reviews-mark--google" />
      </span>
      <GoogleStars
        reviewCount={google.reviewCount}
        avgRating={google.rating}
        className="profile-hero__google-stars"
      />
    </>
  );

  if (google.locked) {
    return (
      <div
        className="profile-hero__reviews-google profile-hero__reviews-google--locked"
        aria-label="Google Reviews — unlock with SMOAC Pro"
        title="Google Reviews — unlock with SMOAC Pro"
      >
        {googleRow}
      </div>
    );
  }

  if (google.mapsHref && google.connected) {
    return (
      <a
        href={google.mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="smoac-control profile-hero__reviews-google"
        aria-label="Open Google Business Profile reviews for this specialist"
        onClick={(event) => event.stopPropagation()}
      >
        {googleRow}
      </a>
    );
  }

  return (
    <div
      className={cn(
        "profile-hero__reviews-google",
        "profile-hero__reviews-google--muted"
      )}
      aria-label="Google Reviews not connected yet"
    >
      {googleRow}
    </div>
  );
}

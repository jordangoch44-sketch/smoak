"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type CSSProperties } from "react";
import type { Trainer } from "@/types";
import { useHydrated } from "@/hooks/useHydrated";
import { useSpecialistReviews } from "@/hooks/useSpecialistReviews";
import { useTrainerWithOverrides } from "@/hooks/useTrainerWithOverrides";
import { ProfileInquiryAction } from "@/components/inquiry";
import {
  getApprovedSpecialistProfilesHydratedServerSnapshot,
  getApprovedSpecialistProfilesHydratedSnapshot,
  subscribeApprovedSpecialistProfiles,
} from "@/lib/approved-specialist-profiles-store";
import { resolveTrainerReviewSources } from "@/lib/trainer-reviews";
import { trainerFirstName } from "@/lib/reviews/specialist-review-types";
import {
  getProfileAccentRgb,
  normalizeProfileStyle,
} from "@/lib/specialist-profile-style";
import { ProfileHero } from "./ProfileHero";
import { ProfileContactCta } from "./ProfileContactCta";
import { ProfilePrimaryHighlights } from "./ProfilePrimaryHighlights";
import { ProfileTrainerSpecs } from "./ProfileTrainerSpecs";
import { ProfileDiscoveryRails } from "./ProfileDiscoveryRails";
import { Reviews } from "./Reviews";
import { SmoacReviewsSection } from "./SmoacReviewsSection";
import { TrainerProfileSheet } from "./TrainerProfileSheet";
import { cn } from "@/lib/utils";

interface TrainerProfilePageClientProps {
  trainerId: string;
  initialTrainer: Trainer | null;
}

export function TrainerProfilePageClient({
  trainerId,
  initialTrainer,
}: TrainerProfilePageClientProps) {
  const hydrated = useHydrated();
  const catalogReady = useSyncExternalStore(
    subscribeApprovedSpecialistProfiles,
    getApprovedSpecialistProfilesHydratedSnapshot,
    getApprovedSpecialistProfilesHydratedServerSnapshot
  );
  const liveTrainer = useTrainerWithOverrides(trainerId);
  const trainer = liveTrainer ?? initialTrainer;
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const {
    aggregate,
    reviews: smoacReviews,
    hasMore,
    loadingMore,
    loadMore,
    ownReview,
    canLeaveReview,
    applySubmittedReview,
  } = useSpecialistReviews(trainerId);

  if (!trainer && hydrated && catalogReady) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-white">Specialist not found</h1>
        <p className="mt-2 text-white/60">
          The specialist you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/explore" className="login-submit">
            Explore Specialists
          </Link>
          <Link href="/" className="wizard-nav__back">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-white/60">
        Loading specialist profile…
      </div>
    );
  }

  const sources = resolveTrainerReviewSources(trainer);
  const googleCount = sources?.google ?? 0;
  const profileStyle = normalizeProfileStyle(trainer.profileStyle);
  const pageStyle = {
    "--profile-accent-rgb": getProfileAccentRgb(profileStyle.accent),
  } as CSSProperties;

  return (
    <TrainerProfileSheet label={`${trainer.name} profile`}>
      <div
        className={cn("profile-page--styled")}
        style={pageStyle}
        data-profile-accent={profileStyle.accent}
      >
      <ProfileHero
        trainer={trainer}
        smoacAggregate={aggregate}
        canLeaveReview={canLeaveReview}
        hasOwnReview={Boolean(ownReview)}
        onLeaveReview={() => setReviewModalOpen(true)}
      />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-3 sm:px-6 sm:pb-20 sm:pt-5 lg:py-12">
        <div className="profile-content profile-content--streamlined min-w-0 max-w-3xl">
          <ProfileContactCta
            specialistName={trainer.name}
            onContact={() => setInquiryOpen(true)}
          />

          <ProfilePrimaryHighlights trainer={trainer} />

          <SmoacReviewsSection
            specialistId={trainer.id}
            specialistName={trainer.name}
            firstName={trainerFirstName(trainer.name)}
            aggregate={aggregate}
            reviews={smoacReviews}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={() => void loadMore()}
            canLeaveReview={canLeaveReview}
            ownReview={ownReview}
            reviewModalOpen={reviewModalOpen}
            onReviewModalOpenChange={setReviewModalOpen}
            onSubmitted={applySubmittedReview}
          />

          {(trainer.reviews?.length ?? 0) > 0 ? (
            <Reviews
              reviews={trainer.reviews}
              rating={trainer.rating}
              reviewCount={trainer.reviewCount}
              className="profile-section--reviews"
              sourceLabel={googleCount > 0 ? "google" : "general"}
            />
          ) : null}

          <ProfileTrainerSpecs trainer={trainer} />

          <ProfileDiscoveryRails trainer={trainer} />
        </div>
      </div>
      </div>

      <ProfileInquiryAction
        specialistId={trainer.id}
        specialistName={trainer.name}
        specialistProfession={trainer.profession}
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        showButton={false}
      />
    </TrainerProfileSheet>
  );
}

"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Trainer } from "@/types";
import type { TrainerCityRanking } from "@/data/city-rankings";
import { AdminProfileModerationBar } from "@/components/admin/AdminProfileModerationBar";
import { useHydrated } from "@/hooks/useHydrated";
import { useSpecialistReviews } from "@/hooks/useSpecialistReviews";
import { isTrainerFreeFirstSessionEligible } from "@/lib/free-first-session";
import { isLeaveReviewQuery } from "@/lib/reviews/leave-review-href";
import {
  getProfileAccentRgb,
  normalizeProfileStyle,
} from "@/lib/specialist-profile-style";
import { ProfileContactCta } from "./ProfileContactCta";
import { ProfileDiscoveryRails } from "./ProfileDiscoveryRails";
import { ProfileHero } from "./ProfileHero";
import {
  ProfileSheetTabs,
  type ProfileSheetTabId,
} from "./ProfileSheetTabs";
import { ProfileTrainerSpecs } from "./ProfileTrainerSpecs";
import { SmoacReviewsSection } from "./SmoacReviewsSection";

/**
 * Marketplace specialist profile body — Live dashboard and /trainers/[id]
 * render this same tree so an edit updates both views.
 */
export function TrainerProfileView({
  trainer,
  cityRanking = null,
  variant = "public",
  onClaimFreeSession,
  onInquire,
}: {
  trainer: Trainer;
  cityRanking?: TrainerCityRanking | null;
  variant?: "public" | "specialist-live";
  onClaimFreeSession?: () => void;
  onInquire: () => void;
}) {
  const hydrated = useHydrated();
  const isSpecialistLive = variant === "specialist-live";
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<ProfileSheetTabId>("details");
  const {
    aggregate,
    reviews: smoacReviews,
    hasMore,
    loadingMore,
    loadMore,
    sort,
    setSort,
    ownReview,
    canLeaveReview,
    applySubmittedReview,
  } = useSpecialistReviews(trainer.id);

  const profileStyle = normalizeProfileStyle(trainer.profileStyle);
  const pageStyle = {
    "--profile-accent-rgb": getProfileAccentRgb(profileStyle.accent),
  } as CSSProperties;
  const offersFreeFirstSession = isTrainerFreeFirstSessionEligible(trainer);

  useEffect(() => {
    if (!hydrated || isSpecialistLive || !canLeaveReview) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (!isLeaveReviewQuery(params.get("review"))) return;
      setSheetTab("reviews");
      setReviewModalOpen(true);
      params.delete("review");
      const next = `${window.location.pathname}${
        params.toString() ? `?${params.toString()}` : ""
      }${window.location.hash}`;
      window.history.replaceState({}, "", next);
    } catch {
      /* ignore malformed URL */
    }
  }, [hydrated, canLeaveReview, isSpecialistLive, trainer.id]);

  return (
    <div
      className="profile-page--styled"
      style={pageStyle}
      data-profile-accent={profileStyle.accent}
      data-profile-name-font={profileStyle.nameFont}
    >
      {isSpecialistLive ? null : (
        <AdminProfileModerationBar
          specialistId={trainer.id}
          specialistName={trainer.name}
        />
      )}
      <ProfileHero
        trainer={trainer}
        variant={variant}
        smoacAggregate={aggregate}
        cityRanking={cityRanking}
        canLeaveReview={isSpecialistLive ? false : canLeaveReview}
        hasOwnReview={isSpecialistLive ? false : Boolean(ownReview)}
        onLeaveReview={
          isSpecialistLive
            ? undefined
            : () => {
                setSheetTab("reviews");
                setReviewModalOpen(true);
              }
        }
        onClaimFreeSession={
          offersFreeFirstSession ? onClaimFreeSession : undefined
        }
      />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-3 sm:px-6 sm:pb-20 sm:pt-5 lg:py-12">
        <div className="profile-content profile-content--streamlined min-w-0 max-w-3xl">
          <ProfileSheetTabs
            value={sheetTab}
            onChange={setSheetTab}
            details={<ProfileTrainerSpecs trainer={trainer} />}
            reviews={
              <SmoacReviewsSection
                specialistId={trainer.id}
                specialistName={trainer.name}
                aggregate={aggregate}
                reviews={smoacReviews}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={() => void loadMore()}
                sort={sort}
                onSortChange={setSort}
                reviewModalOpen={reviewModalOpen}
                onReviewModalOpenChange={setReviewModalOpen}
                onSubmitted={applySubmittedReview}
                canLeaveReview={isSpecialistLive ? false : canLeaveReview}
                trainer={trainer}
              />
            }
            inquire={
              <ProfileContactCta
                specialistName={trainer.name}
                onContact={onInquire}
              />
            }
          />

          <ProfileDiscoveryRails trainer={trainer} />
        </div>
      </div>
    </div>
  );
}

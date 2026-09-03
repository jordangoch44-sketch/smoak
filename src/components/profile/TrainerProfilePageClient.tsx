"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { Trainer } from "@/types";
import type { TrainerCityRanking } from "@/data/city-rankings";
import { useHydrated } from "@/hooks/useHydrated";
import { useSpecialistReviews } from "@/hooks/useSpecialistReviews";
import { useTrainerWithOverrides } from "@/hooks/useTrainerWithOverrides";
import { AdminProfileModerationBar } from "@/components/admin/AdminProfileModerationBar";
import { ProfileInquiryAction } from "@/components/inquiry";
import {
  getApprovedSpecialistProfilesHydratedServerSnapshot,
  getApprovedSpecialistProfilesHydratedSnapshot,
  subscribeApprovedSpecialistProfiles,
} from "@/lib/approved-specialist-profiles-store";
import { reviewAggregatesFromSerialized } from "@/lib/reviews/specialist-review-types";
import type { SpecialistReviewAggregate } from "@/lib/reviews/specialist-review-types";
import { isLeaveReviewQuery } from "@/lib/reviews/leave-review-href";
import { getLiveTrainerCityRanking } from "@/lib/smoac-rankings";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { recordSpecialistEngagement } from "@/lib/specialist-engagement-tracking";
import {
  getProfileAccentRgb,
  normalizeProfileStyle,
} from "@/lib/specialist-profile-style";
import { ProfileHero } from "./ProfileHero";
import { ProfileContactCta } from "./ProfileContactCta";
import { ProfileTrainerSpecs } from "./ProfileTrainerSpecs";
import { ProfileDiscoveryRails } from "./ProfileDiscoveryRails";
import { SmoacReviewsSection } from "./SmoacReviewsSection";
import {
  ProfileSheetTabs,
  type ProfileSheetTabId,
} from "./ProfileSheetTabs";
import { TrainerProfileSheet } from "./TrainerProfileSheet";
import { cn } from "@/lib/utils";

interface TrainerProfilePageClientProps {
  trainerId: string;
  initialTrainer: Trainer | null;
  /** Same-city peers for competitive rank (SSR). */
  initialCatalog?: Trainer[];
  initialAggregates?: SpecialistReviewAggregate[];
  initialCityRanking?: TrainerCityRanking | null;
}

export function TrainerProfilePageClient({
  trainerId,
  initialTrainer,
  initialCatalog = [],
  initialAggregates = [],
  initialCityRanking = null,
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
  const [sheetTab, setSheetTab] = useState<ProfileSheetTabId>("details");
  const [cityRanking, setCityRanking] = useState<TrainerCityRanking | null>(
    initialCityRanking
  );
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
  } = useSpecialistReviews(trainerId);

  useEffect(() => {
    setSheetTab("details");
  }, [trainerId]);

  useEffect(() => {
    if (!hydrated || !canLeaveReview) return;
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
  }, [hydrated, canLeaveReview, trainerId]);

  useEffect(() => {
    const current = liveTrainer ?? initialTrainer;
    if (!current) {
      setCityRanking(null);
      return;
    }

    const peers =
      initialCatalog.length > 0
        ? initialCatalog
        : initialTrainer
          ? [initialTrainer]
          : [];
    const map = reviewAggregatesFromSerialized(initialAggregates);
    // Refresh when this specialist's SMOAC aggregate changes (new review).
    if (aggregate) {
      map.set(current.id, {
        specialistId: current.id,
        reviewCount: aggregate.reviewCount,
        avgRating: aggregate.avgRating,
      });
    }
    setCityRanking(getLiveTrainerCityRanking(current, peers, map));
  }, [
    trainerId,
    liveTrainer,
    initialTrainer,
    initialCatalog,
    initialAggregates,
    aggregate?.reviewCount,
    aggregate?.avgRating,
  ]);

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

  const profileStyle = normalizeProfileStyle(trainer.profileStyle);
  const pageStyle = {
    "--profile-accent-rgb": getProfileAccentRgb(profileStyle.accent),
  } as CSSProperties;

  return (
    <TrainerProfileSheet
      label={`${trainer.name} profile`}
      trainerId={trainer.id}
    >
      <div
        className={cn("profile-page--styled")}
        style={pageStyle}
        data-profile-accent={profileStyle.accent}
      >
      <AdminProfileModerationBar
        specialistId={trainer.id}
        specialistName={trainer.name}
      />
      <ProfileHero
        trainer={trainer}
        smoacAggregate={aggregate}
        cityRanking={cityRanking}
        canLeaveReview={canLeaveReview}
        hasOwnReview={Boolean(ownReview)}
        onLeaveReview={() => {
          setSheetTab("reviews");
          setReviewModalOpen(true);
        }}
      />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-3 sm:px-6 sm:pb-20 sm:pt-5 lg:py-12">
        <div className="profile-content profile-content--streamlined min-w-0 max-w-3xl">
          <ProfileSheetTabs
            value={sheetTab}
            onChange={setSheetTab}
            details={
              <ProfileTrainerSpecs trainer={trainer} />
            }
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
                canLeaveReview={canLeaveReview}
              />
            }
            inquire={
              <ProfileContactCta
                specialistName={trainer.name}
                onContact={() => {
                  recordSpecialistEngagement({
                    event: "contact_click",
                    specialistId: trainer.id,
                    surface: "profile",
                    oncePerSession: true,
                  });
                  setInquiryOpen(true);
                }}
              />
            }
          />

          <ProfileDiscoveryRails trainer={trainer} />
        </div>
      </div>
      </div>

      <ProfileInquiryAction
        specialistId={trainer.id}
        specialistName={trainer.name}
        specialistProfession={
          resolveTrainerProfessionCategory(trainer) || trainer.profession
        }
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        showButton={false}
      />
    </TrainerProfileSheet>
  );
}

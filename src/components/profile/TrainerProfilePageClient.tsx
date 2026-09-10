"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import type { Trainer } from "@/types";
import type { TrainerCityRanking } from "@/data/city-rankings";
import { useHydrated } from "@/hooks/useHydrated";
import { useSpecialistReviews } from "@/hooks/useSpecialistReviews";
import { useTrainerWithOverrides } from "@/hooks/useTrainerWithOverrides";
import { peekPrimedTrainer } from "@/lib/primed-trainer-profile";
import { AdminProfileModerationBar } from "@/components/admin/AdminProfileModerationBar";
import { ProfileInquiryAction } from "@/components/inquiry";
import {
  getApprovedSpecialistProfilesHydratedServerSnapshot,
  getApprovedSpecialistProfilesHydratedSnapshot,
  mergeApprovedSpecialistProfileLocal,
  subscribeApprovedSpecialistProfiles,
} from "@/lib/approved-specialist-profiles-store";
import { getLiveTrainerCityRanking } from "@/lib/smoac-rankings";
import { INQUIRY_TOPIC_FREE_FIRST_SESSION } from "@/lib/inquiry-options";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { isTrainerFreeFirstSessionEligible } from "@/lib/free-first-session";
import { recordSpecialistEngagement } from "@/lib/specialist-engagement-tracking";
import { overlayTrainerMembership } from "@/lib/trainer-sponsorship";
import { trainerMatchesPublicKey } from "@/lib/trainer-profile-path";
import { reviewAggregatesFromSerialized } from "@/lib/reviews/specialist-review-types";
import type { SpecialistReviewAggregate } from "@/lib/reviews/specialist-review-types";
import { isLeaveReviewQuery } from "@/lib/reviews/leave-review-href";
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
  /** Soft-nav intercept — cover the still-mounted listing on desktop. */
  intercept?: boolean;
}

export function TrainerProfilePageClient({
  trainerId,
  initialTrainer,
  initialCatalog = [],
  initialAggregates = [],
  initialCityRanking = null,
  intercept = false,
}: TrainerProfilePageClientProps) {
  const hydrated = useHydrated();
  const catalogReady = useSyncExternalStore(
    subscribeApprovedSpecialistProfiles,
    getApprovedSpecialistProfilesHydratedSnapshot,
    getApprovedSpecialistProfilesHydratedServerSnapshot
  );
  const params = useParams();
  const routeId =
    typeof params?.id === "string" && params.id.length > 0
      ? params.id
      : trainerId;
  const liveTrainer = useTrainerWithOverrides(routeId);
  const primed = peekPrimedTrainer(routeId);
  const ssrTrainer =
    initialTrainer &&
    (trainerMatchesPublicKey(initialTrainer, routeId) ||
      trainerMatchesPublicKey(initialTrainer, trainerId))
      ? initialTrainer
      : null;
  const liveOrPrimed = liveTrainer ?? ssrTrainer ?? primed ?? null;
  const trainer =
    catalogReady && liveTrainer
      ? liveTrainer
      : liveOrPrimed && ssrTrainer
        ? overlayTrainerMembership(liveOrPrimed, ssrTrainer)
        : liveOrPrimed;
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryIntent, setInquiryIntent] = useState<
    "default" | "claim_free_session"
  >("default");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<ProfileSheetTabId>("details");
  const [sheetRouteId, setSheetRouteId] = useState(routeId);
  if (sheetRouteId !== routeId) {
    setSheetRouteId(routeId);
    setSheetTab("details");
    setInquiryOpen(false);
    setInquiryIntent("default");
    setReviewModalOpen(false);
  }
  /* Reviews are stored by internal specialist id, not the public URL slug. */
  const reviewSpecialistId = trainer?.id || trainerId;
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
  } = useSpecialistReviews(reviewSpecialistId);

  useEffect(() => {
    if (!ssrTrainer || catalogReady) return;
    mergeApprovedSpecialistProfileLocal(ssrTrainer);
  }, [ssrTrainer, catalogReady]);

  const cityRanking = useMemo(() => {
    const current = trainer;
    if (!current) return null;

    const peers =
      initialCatalog.length > 0
        ? initialCatalog
        : initialTrainer
          ? [initialTrainer]
          : [];
    const map = reviewAggregatesFromSerialized(initialAggregates);
    if (aggregate) {
      map.set(current.id, {
        specialistId: current.id,
        reviewCount: aggregate.reviewCount,
        avgRating: aggregate.avgRating,
      });
    } else if (
      initialCityRanking &&
      initialTrainer &&
      trainerMatchesPublicKey(current, routeId) &&
      current.id === initialTrainer.id
    ) {
      return initialCityRanking;
    }
    return getLiveTrainerCityRanking(current, peers, map);
  }, [
    routeId,
    trainer,
    initialTrainer,
    initialCatalog,
    initialAggregates,
    initialCityRanking,
    aggregate,
  ]);

  useLayoutEffect(() => {
    const sheetBody = document.querySelector(".profile-sheet__body");
    if (sheetBody instanceof HTMLElement) {
      sheetBody.scrollTop = 0;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [routeId]);

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
  }, [hydrated, canLeaveReview, routeId]);

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
  const offersFreeFirstSession = isTrainerFreeFirstSessionEligible(trainer);
  const openInquiry = (intent: "default" | "claim_free_session") => {
    recordSpecialistEngagement({
      event: "contact_click",
      specialistId: trainer.id,
      surface: "profile",
      oncePerSession: true,
    });
    setInquiryIntent(intent);
    setInquiryOpen(true);
  };

  return (
    <TrainerProfileSheet
      key={trainer.id}
      label={`${trainer.name} profile`}
      trainerId={trainer.id}
      intercept={intercept}
    >
      <div
        key={trainer.id}
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
        onClaimFreeSession={
          offersFreeFirstSession
            ? () => openInquiry("claim_free_session")
            : undefined
        }
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
                trainer={trainer}
              />
            }
            inquire={
              <ProfileContactCta
                specialistName={trainer.name}
                onContact={() => openInquiry("default")}
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
        offersFreeFirstSession={offersFreeFirstSession}
        preselectTopicId={
          inquiryIntent === "claim_free_session"
            ? INQUIRY_TOPIC_FREE_FIRST_SESSION.id
            : undefined
        }
      />
    </TrainerProfileSheet>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { Trainer } from "@/types";
import type { TrainerCityRanking } from "@/data/city-rankings";
import { useHydrated } from "@/hooks/useHydrated";
import { useTrainerWithOverrides } from "@/hooks/useTrainerWithOverrides";
import { peekPrimedTrainer } from "@/lib/primed-trainer-profile";
import { PageWaitState } from "@/components/brand/PageWaitState";
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
import { TrainerProfileSheet } from "./TrainerProfileSheet";
import { TrainerProfileView } from "./TrainerProfileView";

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
  const [sheetRouteId, setSheetRouteId] = useState(routeId);
  if (sheetRouteId !== routeId) {
    setSheetRouteId(routeId);
    setInquiryOpen(false);
    setInquiryIntent("default");
  }

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
    if (
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
  ]);

  useLayoutEffect(() => {
    const sheetBody = document.querySelector(".profile-sheet__body");
    if (sheetBody instanceof HTMLElement) {
      sheetBody.scrollTop = 0;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [routeId]);

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
      <PageWaitState label="Loading specialist profile" />
    );
  }

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
      <TrainerProfileView
        trainer={trainer}
        cityRanking={cityRanking}
        onClaimFreeSession={
          offersFreeFirstSession
            ? () => openInquiry("claim_free_session")
            : undefined
        }
        onInquire={() => openInquiry("default")}
      />

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

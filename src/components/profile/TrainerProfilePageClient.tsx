"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { Trainer } from "@/types";
import { useHydrated } from "@/hooks/useHydrated";
import { useTrainerWithOverrides } from "@/hooks/useTrainerWithOverrides";
import { ProfileInquiryAction } from "@/components/inquiry";
import {
  getApprovedSpecialistProfilesHydratedServerSnapshot,
  getApprovedSpecialistProfilesHydratedSnapshot,
  subscribeApprovedSpecialistProfiles,
} from "@/lib/approved-specialist-profiles-store";
import { ProfileHero } from "./ProfileHero";
import { ProfileContactCta } from "./ProfileContactCta";
import { ProfilePrimaryHighlights } from "./ProfilePrimaryHighlights";
import { ProfileTrainerSpecs } from "./ProfileTrainerSpecs";
import { ProfileDiscoveryRails } from "./ProfileDiscoveryRails";
import { Reviews } from "./Reviews";
import { TrainerProfileSheet } from "./TrainerProfileSheet";

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

  return (
    <TrainerProfileSheet label={`${trainer.name} profile`}>
      <ProfileHero trainer={trainer} />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-3 sm:px-6 sm:pb-20 sm:pt-5 lg:py-12">
        <div className="profile-content profile-content--streamlined min-w-0 max-w-3xl">
          <ProfileContactCta
            specialistName={trainer.name}
            onContact={() => setInquiryOpen(true)}
          />

          <ProfilePrimaryHighlights trainer={trainer} />

          <Reviews
            reviews={trainer.reviews}
            rating={trainer.rating}
            reviewCount={trainer.reviewCount}
            className="profile-section--reviews"
          />

          <ProfileTrainerSpecs trainer={trainer} />

          <ProfileDiscoveryRails trainer={trainer} />
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

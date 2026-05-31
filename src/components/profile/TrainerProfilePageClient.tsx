"use client";

import { notFound } from "next/navigation";
import type { Trainer } from "@/types";
import { useHydrated } from "@/hooks/useHydrated";
import { useTrainerWithOverrides } from "@/hooks/useTrainerWithOverrides";
import { ProfileHero } from "./ProfileHero";
import { ProfileCuratedDetails } from "./ProfileCuratedDetails";
import { ProfileServiceArea } from "./ProfileServiceArea";
import { ProfileSessionExperience } from "./ProfileSessionExperience";
import { Bio } from "./Bio";
import { Certifications } from "./Certifications";
import { Reviews } from "./Reviews";
import { SocialLinks } from "./SocialLinks";
import { BookConsultation } from "./BookConsultation";

interface TrainerProfilePageClientProps {
  trainerId: string;
  initialTrainer: Trainer | null;
}

export function TrainerProfilePageClient({
  trainerId,
  initialTrainer,
}: TrainerProfilePageClientProps) {
  const hydrated = useHydrated();
  const liveTrainer = useTrainerWithOverrides(trainerId);
  const trainer = liveTrainer ?? initialTrainer;

  if (!trainer && hydrated) {
    notFound();
  }

  if (!trainer) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-white/60">
        Loading specialist profile…
      </div>
    );
  }

  return (
    <>
      <ProfileHero trainer={trainer} />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-6 lg:py-16">
        <div className="lg:grid lg:grid-cols-3 lg:gap-16">
          <div className="profile-content min-w-0 lg:col-span-2">
            <ProfileServiceArea trainer={trainer} />
            <ProfileCuratedDetails trainer={trainer} />
            <ProfileSessionExperience trainer={trainer} />
            <Bio trainer={trainer} />
            <Certifications certifications={trainer.certifications} />
            <Reviews
              reviews={trainer.reviews}
              rating={trainer.rating}
              reviewCount={trainer.reviewCount}
            />
            <SocialLinks social={trainer.social} />
          </div>

          <div className="mt-4 min-w-0 lg:col-span-1 lg:mt-0">
            <BookConsultation trainerName={trainer.name} />
          </div>
        </div>
      </div>
    </>
  );
}

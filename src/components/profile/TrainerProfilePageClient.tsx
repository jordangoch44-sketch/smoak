"use client";

import type { Trainer } from "@/types";
import { useTrainerWithOverrides } from "@/hooks/useTrainerWithOverrides";
import {
  ProfileHero,
  ProfileHeroToolbar,
  ProfileCuratedDetails,
  ProfileSessionExperience,
  Bio,
  Certifications,
  Reviews,
  SocialLinks,
  BookConsultation,
} from "@/components/profile";

interface TrainerProfilePageClientProps {
  trainerId: string;
  initialTrainer: Trainer;
}

export function TrainerProfilePageClient({
  trainerId,
  initialTrainer,
}: TrainerProfilePageClientProps) {
  const liveTrainer = useTrainerWithOverrides(trainerId);
  const trainer = liveTrainer ?? initialTrainer;

  return (
    <>
      <ProfileHero trainer={trainer} />
      <ProfileHeroToolbar
        trainerId={trainer.id}
        trainerName={trainer.name}
      />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-6 lg:py-16">
        <div className="lg:grid lg:grid-cols-3 lg:gap-16">
          <div className="profile-content min-w-0 lg:col-span-2">
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

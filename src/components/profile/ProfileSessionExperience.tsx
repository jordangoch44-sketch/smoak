"use client";

import { useState } from "react";
import type { Trainer } from "@/types";
import { trainingOptionCardsFromTrainer } from "@/lib/profile-details-visual";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";
import { ProfileTrainingOptionRow } from "./ProfileTrainingOptionRow";

interface ProfileSessionExperienceProps {
  trainer: Trainer;
}

export function ProfileSessionExperience({
  trainer,
}: ProfileSessionExperienceProps) {
  const cards = trainingOptionCardsFromTrainer(trainer);
  const [openId, setOpenId] = useState<string | null>(null);
  if (cards.length === 0) return null;

  return (
    <ProfileSection variant="panel" aria-label="Training options">
      <ProfileSectionHeader title="Training options" />
      <p className="profile-train-lead">Choose your style of training:</p>
      <ul className="profile-section-body profile-train-tiles">
        {cards.map((card) => (
          <ProfileTrainingOptionRow
            key={card.id}
            card={card}
            open={openId === card.id}
            onToggle={() =>
              setOpenId((current) => (current === card.id ? null : card.id))
            }
          />
        ))}
      </ul>
    </ProfileSection>
  );
}

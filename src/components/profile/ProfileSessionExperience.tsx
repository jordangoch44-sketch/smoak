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
  if (cards.length === 0) return null;

  return (
    <ProfileSection variant="panel" aria-label="Training options">
      <ProfileSectionHeader title="Training options" />
      <ul className="profile-section-body profile-train-tiles">
        {cards.map((card) => (
          <ProfileTrainingOptionRow key={card.id} card={card} />
        ))}
      </ul>
    </ProfileSection>
  );
}

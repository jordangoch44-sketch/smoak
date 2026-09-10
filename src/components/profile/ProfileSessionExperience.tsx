import type { Trainer } from "@/types";
import { trainingOptionCardsFromTrainer } from "@/lib/profile-details-visual";
import { ProfileTrainingKindIcon } from "./ProfileDetailsIcons";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

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
          <li key={card.id} className="profile-train-tile">
            <span className="profile-train-tile__icon" aria-hidden>
              <ProfileTrainingKindIcon
                kind={card.kind}
                className="profile-train-tile__glyph"
              />
            </span>
            <span className="profile-train-tile__label">{card.title}</span>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}

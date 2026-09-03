import type { Trainer } from "@/types";
import {
  trainerTextureUrls,
  trainingOptionCardsFromTrainer,
} from "@/lib/profile-details-visual";
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
  const textures = trainerTextureUrls(trainer);

  return (
    <ProfileSection variant="panel" aria-label="Training options">
      <ProfileSectionHeader title="Training options" />
      <ul className="profile-section-body profile-train-grid">
        {cards.map((card, index) => {
          const texture = textures[index % Math.max(textures.length, 1)];
          return (
            <li key={card.id} className="profile-train-card">
              {texture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={texture} alt="" className="profile-train-card__photo" />
              ) : null}
              <span className="profile-train-card__wash" aria-hidden />
              <span className="profile-train-card__icon" aria-hidden>
                <ProfileTrainingKindIcon
                  kind={card.kind}
                  className="profile-train-card__glyph"
                />
              </span>
              <p className="profile-train-card__title">{card.title}</p>
              <p className="profile-train-card__copy">{card.description}</p>
            </li>
          );
        })}
      </ul>
    </ProfileSection>
  );
}

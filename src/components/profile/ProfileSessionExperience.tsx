import type { Trainer } from "@/types";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";
import { ProfileSessionIcon } from "./ProfileSessionIcons";

interface ProfileSessionExperienceProps {
  trainer: Trainer;
}

export function ProfileSessionExperience({
  trainer,
}: ProfileSessionExperienceProps) {
  return (
    <ProfileSection variant="panel" aria-label="Session experience">
      <ProfileSectionHeader title="Session experience" />
      <ul className="profile-section-body profile-experience-grid">
        {trainer.sessionExperience.map((item) => (
          <li key={item} className="profile-experience-card">
            <ProfileSessionIcon label={item} />
            <span className="profile-experience-card__label">{item}</span>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}

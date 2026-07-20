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
  const items = Array.isArray(trainer.sessionExperience)
    ? trainer.sessionExperience.filter(
        (item) => typeof item === "string" && item.trim().length > 0
      )
    : [];

  if (items.length === 0) return null;

  return (
    <ProfileSection variant="panel" aria-label="Session experience">
      <ProfileSectionHeader title="Session experience" />
      <ul className="profile-section-body profile-experience-grid">
        {items.map((item) => (
          <li key={item} className="profile-experience-card">
            <ProfileSessionIcon label={item} />
            <span className="profile-experience-card__label">{item}</span>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}

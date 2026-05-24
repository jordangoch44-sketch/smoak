import type { Trainer } from "@/types";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface BioProps {
  trainer: Trainer;
}

export function Bio({ trainer }: BioProps) {
  return (
    <ProfileSection variant="panel" aria-label="About">
      <ProfileSectionHeader title="About" />
      <div className="profile-section-body profile-section-body--loose">
        <p className="profile-body-text">
          {trainer.bio}
        </p>
        <ul className="profile-pill-grid mt-5 sm:mt-6">
          {trainer.specialty.map((s) => (
            <li key={s}>
              <span className="profile-tag-pill profile-tag-pill--grid">{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </ProfileSection>
  );
}

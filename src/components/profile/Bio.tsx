import type { Trainer } from "@/types";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface BioProps {
  trainer: Trainer;
}

export function Bio({ trainer }: BioProps) {
  const specialties = Array.isArray(trainer.specialty)
    ? trainer.specialty.filter(
        (item) => typeof item === "string" && item.trim().length > 0
      )
    : [];
  const bio = typeof trainer.bio === "string" ? trainer.bio.trim() : "";

  if (!bio && specialties.length === 0) return null;

  return (
    <ProfileSection variant="panel" aria-label="About">
      <ProfileSectionHeader title="About" />
      <div className="profile-section-body profile-section-body--loose">
        {bio ? <p className="profile-body-text">{bio}</p> : null}
        {specialties.length > 0 ? (
          <ul className="profile-pill-grid mt-5 sm:mt-6">
            {specialties.map((s) => (
              <li key={s}>
                <span className="profile-tag-pill profile-tag-pill--grid">{s}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </ProfileSection>
  );
}

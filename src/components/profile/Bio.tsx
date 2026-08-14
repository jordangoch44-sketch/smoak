import type { Trainer } from "@/types";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface BioProps {
  trainer: Trainer;
}

/** Specialties under View full profile — bio lives in the hero with expand. */
export function Bio({ trainer }: BioProps) {
  const specialties = Array.isArray(trainer.specialty)
    ? trainer.specialty.filter(
        (item) => typeof item === "string" && item.trim().length > 0
      )
    : [];

  if (specialties.length === 0) return null;

  return (
    <ProfileSection variant="panel" aria-label="Specialties">
      <ProfileSectionHeader title="Specialties" />
      <div className="profile-section-body profile-section-body--loose">
        <ul className="profile-pill-grid">
          {specialties.map((s) => (
            <li key={s}>
              <span className="profile-tag-pill profile-tag-pill--grid">{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </ProfileSection>
  );
}

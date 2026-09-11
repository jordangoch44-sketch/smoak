import type { Trainer } from "@/types";
import { specialtyIconId } from "@/lib/profile-details-visual";
import { sanitizeMarketplaceSpecialties } from "@/lib/specialty-display";
import { ProfileSpecialtyIcon } from "./ProfileDetailsIcons";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface BioProps {
  trainer: Trainer;
}

/** Specialties in the Details tab — bio lives in the hero with expand. */
export function Bio({ trainer }: BioProps) {
  const specialties = sanitizeMarketplaceSpecialties(trainer.specialty);

  if (specialties.length === 0) return null;

  return (
    <ProfileSection variant="panel" aria-label="Specialties">
      <ProfileSectionHeader title="Specialties" />
      <ul className="profile-section-body profile-details-pills">
        {specialties.map((s) => (
          <li key={s}>
            <span className="profile-tag-pill profile-tag-pill--fit">
              <ProfileSpecialtyIcon
                id={specialtyIconId(s)}
                className="profile-tag-pill__icon"
              />
              {s}
            </span>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}

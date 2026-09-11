import type { Trainer } from "@/types";
import { rightFitCopyFromItems, RIGHT_FIT_SECTION_TITLE } from "@/lib/specialist-right-fit";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface ProfileRightFitProps {
  trainer: Trainer;
}

/** Client/specialist match paragraph on the public Details tab. */
export function ProfileRightFit({ trainer }: ProfileRightFitProps) {
  const copy = rightFitCopyFromItems(trainer.bestFor);
  if (!copy) return null;

  return (
    <ProfileSection variant="panel" aria-label={RIGHT_FIT_SECTION_TITLE}>
      <ProfileSectionHeader title={RIGHT_FIT_SECTION_TITLE} />
      <div className="profile-section-body">
        <p className="profile-body-text profile-right-fit__copy">{copy}</p>
      </div>
    </ProfileSection>
  );
}

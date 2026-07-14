import type { Trainer } from "@/types";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";
import { ProfileTransformationSlider } from "./ProfileTransformationSlider";
import { ProfileTrustGrid } from "./ProfileTrustGrid";

interface ProfilePrimaryHighlightsProps {
  trainer: Trainer;
}

/** High-priority profile body: why choose me + transformations only */
export function ProfilePrimaryHighlights({
  trainer,
}: ProfilePrimaryHighlightsProps) {
  return (
    <>
      <ProfileSection
        variant="panel"
        className="profile-section--featured"
        aria-label="Why clients choose me"
      >
        <ProfileSectionHeader title="Why clients choose me" />
        <div className="profile-section-body">
          <ProfileTrustGrid items={trainer.whyClientsChoose} />
        </div>
      </ProfileSection>

      <ProfileSection
        variant="panel"
        className="profile-section--media"
        aria-label="Client transformations"
      >
        <ProfileSectionHeader title="Client transformations" />
        <div className="profile-section-body">
          <ProfileTransformationSlider photos={trainer.clientTransformations} />
        </div>
      </ProfileSection>
    </>
  );
}

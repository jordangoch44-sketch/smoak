import type { Trainer } from "@/types";
import { ProfilePillGrid } from "./ProfilePillGrid";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";
import { ProfileTransformationSlider } from "./ProfileTransformationSlider";
import { ProfileTrustGrid } from "./ProfileTrustGrid";

interface ProfileCuratedDetailsProps {
  trainer: Trainer;
}

export function ProfileCuratedDetails({ trainer }: ProfileCuratedDetailsProps) {
  return (
    <>
      <ProfileSection variant="panel" aria-label="Best for">
        <ProfileSectionHeader title="Best for" />
        <div className="profile-section-body">
          <ProfilePillGrid items={trainer.bestFor} />
        </div>
      </ProfileSection>

      <ProfileSection variant="panel" aria-label="Coaching style">
        <ProfileSectionHeader title="Coaching style" />
        <div className="profile-section-body">
          <ProfilePillGrid items={trainer.coachingStyle} />
        </div>
      </ProfileSection>

      <ProfileSection variant="panel" aria-label="Client transformations">
        <ProfileSectionHeader title="Client transformations" />
        <div className="profile-section-body">
          <ProfileTransformationSlider photos={trainer.clientTransformations} />
        </div>
      </ProfileSection>

      <ProfileSection variant="panel" aria-label="Why clients choose me">
        <ProfileSectionHeader title="Why clients choose me" />
        <div className="profile-section-body">
          <ProfileTrustGrid items={trainer.whyClientsChoose} />
        </div>
      </ProfileSection>
    </>
  );
}

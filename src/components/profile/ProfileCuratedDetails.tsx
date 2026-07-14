import type { Trainer } from "@/types";
import { ProfilePrimaryHighlights } from "./ProfilePrimaryHighlights";
import { ProfilePillGrid } from "./ProfilePillGrid";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface ProfileCuratedDetailsProps {
  trainer: Trainer;
}

/** Full curated block — live profile uses ProfilePrimaryHighlights + Trainer Specs */
export function ProfileCuratedDetails({ trainer }: ProfileCuratedDetailsProps) {
  return (
    <>
      <ProfilePrimaryHighlights trainer={trainer} />
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
    </>
  );
}

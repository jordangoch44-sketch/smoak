import type { Trainer } from "@/types";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";
import { ProfileTransformationSlider } from "./ProfileTransformationSlider";
import { ProfileTrustGrid } from "./ProfileTrustGrid";

interface ProfilePrimaryHighlightsProps {
  trainer: Trainer;
}

function nonEmptyStrings(items: string[] | null | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => typeof item === "string" && item.trim().length > 0);
}

function hasTransformationPhotos(trainer: Trainer): boolean {
  if (!Array.isArray(trainer.clientTransformations)) return false;
  return trainer.clientTransformations.some((photo) => {
    if (!photo || typeof photo !== "object") return false;
    return typeof photo.src === "string" && photo.src.trim().length > 0;
  });
}

/** High-priority profile body: why choose me + transformations only */
export function ProfilePrimaryHighlights({
  trainer,
}: ProfilePrimaryHighlightsProps) {
  const trustItems = nonEmptyStrings(trainer.whyClientsChoose);
  const showTrust = trustItems.length > 0;
  const showTransformations = hasTransformationPhotos(trainer);

  if (!showTrust && !showTransformations) return null;

  return (
    <>
      {showTrust ? (
        <ProfileSection
          variant="panel"
          className="profile-section--featured"
          aria-label="Why clients choose me"
        >
          <ProfileSectionHeader title="Why clients choose me" />
          <div className="profile-section-body">
            <ProfileTrustGrid items={trustItems} />
          </div>
        </ProfileSection>
      ) : null}

      {showTransformations ? (
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
      ) : null}
    </>
  );
}

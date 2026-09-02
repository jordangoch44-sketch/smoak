import type { Trainer } from "@/types";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";
import { ProfileTrustGrid } from "./ProfileTrustGrid";

interface ProfilePrimaryHighlightsProps {
  trainer: Trainer;
}

function nonEmptyStrings(items: string[] | null | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => typeof item === "string" && item.trim().length > 0);
}

/** High-priority profile body: why clients choose me */
export function ProfilePrimaryHighlights({
  trainer,
}: ProfilePrimaryHighlightsProps) {
  const trustItems = nonEmptyStrings(trainer.whyClientsChoose);
  if (trustItems.length === 0) return null;

  return (
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
  );
}

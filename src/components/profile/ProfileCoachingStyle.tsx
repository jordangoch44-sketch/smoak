import type { Trainer } from "@/types";
import { parseCoachingStyleSelection } from "@/constants/specialist-onboarding-options";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface ProfileCoachingStyleProps {
  trainer: Trainer;
}

export function coachingStylesFromTrainer(trainer: Trainer): string[] {
  const list = (trainer.coachingStyle ?? [])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  const canonical = parseCoachingStyleSelection(list.join(" · "));
  if (canonical.length > 0) return canonical;
  return [...new Set(list)];
}

/** Coaching-style pills in the Details tab, under Credentials. */
export function ProfileCoachingStyle({ trainer }: ProfileCoachingStyleProps) {
  const styles = coachingStylesFromTrainer(trainer);
  if (styles.length === 0) return null;

  return (
    <ProfileSection variant="panel" aria-label="Coaching style">
      <ProfileSectionHeader title="Coaching style" />
      <ul className="profile-section-body profile-details-pills">
        {styles.map((style) => (
          <li key={style}>
            <span className="profile-tag-pill profile-tag-pill--fit">
              {style}
            </span>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}

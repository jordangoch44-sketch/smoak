import type { Trainer, TrainerIntroVideo } from "@/types";
import { Bio } from "./Bio";
import { Certifications } from "./Certifications";
import { ProfileCoachingStyle } from "./ProfileCoachingStyle";
import { ProfileOverviewAbout } from "./ProfileOverviewAbout";
import { ProfileRightFit } from "./ProfileRightFit";
import { ProfileServiceArea } from "./ProfileServiceArea";

interface ProfileTrainerSpecsProps {
  trainer: Trainer;
  variant?: "public" | "specialist-live";
  lockedPreviewIntro?: TrainerIntroVideo;
  onAddIntroVideo?: () => void;
  onUpgrade?: () => void;
}

function nonEmptyStrings(items: string[] | null | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => typeof item === "string" && item.trim().length > 0);
}

export function ProfileTrainerSpecs({
  trainer,
  variant = "public",
  lockedPreviewIntro,
  onAddIntroVideo,
  onUpgrade,
}: ProfileTrainerSpecsProps) {
  const accolades = nonEmptyStrings(trainer.resultsSnapshot ?? []);

  return (
    <section className="profile-trainer-specs" aria-label="Overview">
      <div className="profile-trainer-specs__stack">
        <ProfileOverviewAbout
          trainer={trainer}
          variant={variant}
          lockedPreviewIntro={lockedPreviewIntro}
          onAddIntroVideo={onAddIntroVideo}
          onUpgrade={onUpgrade}
        />
        <Bio trainer={trainer} />
        <ProfileRightFit trainer={trainer} />
        <ProfileServiceArea trainer={trainer} />
        <Certifications
          certifications={trainer.certifications}
          accolades={accolades}
        />
        <ProfileCoachingStyle trainer={trainer} />
      </div>
    </section>
  );
}

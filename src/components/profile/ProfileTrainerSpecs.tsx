import type { Trainer } from "@/types";
import { Bio } from "./Bio";
import { Certifications } from "./Certifications";
import { ProfileCoachingStyle } from "./ProfileCoachingStyle";
import { ProfilePricing } from "./ProfilePricing";
import { ProfileRightFit } from "./ProfileRightFit";
import { ProfileServiceArea } from "./ProfileServiceArea";
import { ProfileSessionExperience } from "./ProfileSessionExperience";
import { ProfileTransformations } from "./ProfileTransformations";

interface ProfileTrainerSpecsProps {
  trainer: Trainer;
}

function nonEmptyStrings(items: string[] | null | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => typeof item === "string" && item.trim().length > 0);
}

export function ProfileTrainerSpecs({ trainer }: ProfileTrainerSpecsProps) {
  const accolades = nonEmptyStrings(trainer.resultsSnapshot ?? []);

  return (
    <section className="profile-trainer-specs" aria-label="Full specialist profile">
      <div className="profile-trainer-specs__stack">
        <Bio trainer={trainer} />
        <ProfileTransformations trainer={trainer} />
        <ProfileRightFit trainer={trainer} />
        <ProfileSessionExperience trainer={trainer} />
        <ProfilePricing trainer={trainer} />
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

import type { Trainer } from "@/types";
import { Bio } from "./Bio";
import { Certifications } from "./Certifications";
import { ProfileCoachingStyle, coachingStylesFromTrainer } from "./ProfileCoachingStyle";
import { ProfileRightFit } from "./ProfileRightFit";
import { ProfileServiceArea } from "./ProfileServiceArea";
import { ProfileSessionExperience } from "./ProfileSessionExperience";
import { trainingOptionCardsFromTrainer } from "@/lib/profile-details-visual";
import { rightFitCopyFromItems } from "@/lib/specialist-right-fit";
import { buildLocationTravelDisplay } from "@/lib/specialist-service-area";

interface ProfileTrainerSpecsProps {
  trainer: Trainer;
}

function nonEmptyStrings(items: string[] | null | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => typeof item === "string" && item.trim().length > 0);
}

export function ProfileTrainerSpecs({ trainer }: ProfileTrainerSpecsProps) {
  const specialties = nonEmptyStrings(trainer.specialty);
  const trainingOptions = trainingOptionCardsFromTrainer(trainer);
  const location = buildLocationTravelDisplay(trainer);
  const rightFit = rightFitCopyFromItems(trainer.bestFor);
  const coachingStyles = coachingStylesFromTrainer(trainer);
  const accolades = nonEmptyStrings(trainer.resultsSnapshot ?? []);
  const hasCreds =
    accolades.length > 0 ||
    (Array.isArray(trainer.certifications) &&
      trainer.certifications.some(
        (cert) => cert && typeof cert.name === "string" && cert.name.trim().length > 0
      ));

  if (
    specialties.length === 0 &&
    !rightFit &&
    trainingOptions.length === 0 &&
    !location &&
    !hasCreds &&
    coachingStyles.length === 0
  ) {
    return null;
  }

  return (
    <section className="profile-trainer-specs" aria-label="Full specialist profile">
      <div className="profile-trainer-specs__stack">
        <Bio trainer={trainer} />
        <ProfileRightFit trainer={trainer} />
        <ProfileSessionExperience trainer={trainer} />
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

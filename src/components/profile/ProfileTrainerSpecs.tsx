import type { Trainer } from "@/types";
import { Bio } from "./Bio";
import { Certifications } from "./Certifications";
import { ProfileServiceArea } from "./ProfileServiceArea";
import { ProfileSessionExperience } from "./ProfileSessionExperience";
import { trainingOptionCardsFromTrainer } from "@/lib/profile-details-visual";
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
  const accolades = nonEmptyStrings(trainer.resultsSnapshot ?? []);
  const hasCreds =
    accolades.length > 0 ||
    (Array.isArray(trainer.certifications) &&
      trainer.certifications.some(
        (cert) => cert && typeof cert.name === "string" && cert.name.trim().length > 0
      ));

  if (
    specialties.length === 0 &&
    trainingOptions.length === 0 &&
    !location &&
    !hasCreds
  ) {
    return null;
  }

  return (
    <section className="profile-trainer-specs" aria-label="Full specialist profile">
      <div className="profile-trainer-specs__stack">
        <Bio trainer={trainer} />
        <ProfileSessionExperience trainer={trainer} />
        <ProfileServiceArea trainer={trainer} />
        <Certifications
          certifications={trainer.certifications}
          accolades={accolades}
        />
      </div>
    </section>
  );
}

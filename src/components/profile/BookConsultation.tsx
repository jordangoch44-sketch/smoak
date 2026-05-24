"use client";

import { Button } from "@/components/ui/Button";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface BookConsultationProps {
  trainerName: string;
}

export function BookConsultation({ trainerName }: BookConsultationProps) {
  function handleBook() {
    alert(
      `Consultation booking for ${trainerName} would open here. This is a demo.`
    );
  }

  return (
    <ProfileSection
      variant="panel"
      className="lg:sticky lg:top-28"
      aria-label="Book consultation"
      id="profile-consultation"
    >
      <ProfileSectionHeader title="Consultation" />
      <div className="profile-section-body profile-section-body--loose profile-cta-glow">
        <p className="profile-body-text text-sm">
          Schedule a complimentary 15-minute call to discuss your goals and
          determine if this specialist is the right fit.
        </p>
        <div className="mt-5 sm:mt-6">
          <Button
            variant="primary"
            className="w-full shadow-[0_0_28px_rgba(255,255,255,0.07)]"
            onClick={handleBook}
          >
            Book Consultation
          </Button>
        </div>
        <p className="mt-4 text-center text-xs font-normal text-silver-500">
          Free · No commitment required
        </p>
      </div>
    </ProfileSection>
  );
}

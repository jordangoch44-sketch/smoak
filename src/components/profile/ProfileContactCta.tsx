"use client";

import { useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { TrustActionSheet } from "@/components/trust/TrustActionSheet";
import { cn } from "@/lib/utils";

interface ProfileContactCtaProps {
  specialistId: string;
  specialistName: string;
  onContact: () => void;
  showReport?: boolean;
  className?: string;
}

/** Single inquiry entry point — topic selection lives in the contact sheet */
export function ProfileContactCta({
  specialistId,
  specialistName,
  onContact,
  showReport = true,
  className,
}: ProfileContactCtaProps) {
  const [reportOpen, setReportOpen] = useState(false);
  return (
    <section
      className={cn("profile-contact-cta", className)}
      aria-label={`Contact ${specialistName}`}
    >
      <p className="profile-contact-cta__eyebrow">Questions / Inquire</p>
      <h2 className="profile-contact-cta__title">
        Have a question for this specialist?
      </h2>
      <p className="profile-contact-cta__support">
        Ask about pricing, availability, services, or anything else.
      </p>
      <FastActivateButton
        className="smoac-control profile-contact-cta__button"
        onActivate={onContact}
      >
        Contact Specialist
      </FastActivateButton>
      <p className="profile-contact-cta__helper">
        Your inquiry is sent to their portal and email.
      </p>
      {showReport ? (
        <button
          type="button"
          className="profile-contact-cta__report"
          onClick={() => setReportOpen(true)}
        >
          Report this profile
        </button>
      ) : null}
      {reportOpen ? (
        <TrustActionSheet
          mode="report"
          surface="profile"
          specialistId={specialistId}
          specialistName={specialistName}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </section>
  );
}

"use client";

import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { cn } from "@/lib/utils";

interface ProfileContactCtaProps {
  specialistName: string;
  onContact: () => void;
  className?: string;
}

/** Single inquiry entry point — topic selection lives in the contact sheet */
export function ProfileContactCta({
  specialistName,
  onContact,
  className,
}: ProfileContactCtaProps) {
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
    </section>
  );
}

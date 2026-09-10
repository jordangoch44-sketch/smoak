"use client";

import { useCallback, useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { SpecialistInquirySheet } from "./SpecialistInquirySheet";

interface ProfileInquiryActionProps {
  specialistId: string;
  specialistName: string;
  specialistProfession?: string;
  /** Optional controlled open (e.g. from a secondary CTA) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  buttonLabel?: string;
  className?: string;
  showButton?: boolean;
  offersFreeFirstSession?: boolean;
  preselectTopicId?: string;
}

export function ProfileInquiryAction({
  specialistId,
  specialistName,
  specialistProfession = "",
  open: controlledOpen,
  onOpenChange,
  buttonLabel = "Contact Specialist",
  className,
  showButton = true,
  offersFreeFirstSession = false,
  preselectTopicId,
}: ProfileInquiryActionProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (controlledOpen === undefined) {
        setInternalOpen(next);
      }
    },
    [controlledOpen, onOpenChange]
  );

  const profilePath =
    typeof window !== "undefined"
      ? window.location.pathname
      : `/trainers/${specialistId}`;

  return (
    <>
      {showButton ? (
        <FastActivateButton
          className={className ?? "smoac-control profile-inquiry-cta"}
          onActivate={() => setOpen(true)}
        >
          {buttonLabel}
        </FastActivateButton>
      ) : null}
      <SpecialistInquirySheet
        open={open}
        onClose={() => setOpen(false)}
        specialistId={specialistId}
        specialistName={specialistName}
        specialistProfession={specialistProfession}
        profilePath={profilePath || `/trainers/${specialistId}`}
        offersFreeFirstSession={offersFreeFirstSession}
        preselectTopicId={preselectTopicId}
      />
    </>
  );
}

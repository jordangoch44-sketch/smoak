"use client";

import { useCallback, useState } from "react";
import type { InquiryActionId } from "@/lib/inquiry-options";
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
  initialAction?: InquiryActionId;
  showButton?: boolean;
}

export function ProfileInquiryAction({
  specialistId,
  specialistName,
  specialistProfession = "",
  open: controlledOpen,
  onOpenChange,
  buttonLabel = "Contact Specialist",
  className,
  initialAction,
  showButton = true,
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

  const profilePath = `/trainers/${encodeURIComponent(specialistId)}`;
  const onClose = useCallback(() => setOpen(false), [setOpen]);

  return (
    <>
      {showButton ? (
        <button
          type="button"
          className={className ?? "smoac-control profile-inquiry-cta"}
          onClick={() => setOpen(true)}
        >
          {buttonLabel}
        </button>
      ) : null}
      <SpecialistInquirySheet
        open={open}
        onClose={onClose}
        specialistId={specialistId}
        specialistName={specialistName}
        specialistProfession={specialistProfession}
        profilePath={profilePath}
        initialAction={initialAction}
      />
    </>
  );
}

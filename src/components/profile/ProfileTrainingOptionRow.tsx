"use client";

import { useId, useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { TrainingOptionCard } from "@/lib/profile-details-visual";
import { ProfileTrainingKindIcon } from "./ProfileDetailsIcons";

export function ProfileTrainingOptionRow({
  card,
}: {
  card: TrainingOptionCard;
}) {
  const detailsId = useId();
  const [open, setOpen] = useState(false);

  return (
    <li className={cn("profile-train-tile", open && "profile-train-tile--open")}>
      <FastActivateButton
        className="smoac-control profile-train-tile__toggle"
        aria-expanded={open}
        aria-controls={detailsId}
        onActivate={() => setOpen((value) => !value)}
      >
        <span className="profile-train-tile__icon" aria-hidden>
          <ProfileTrainingKindIcon
            kind={card.kind}
            className="profile-train-tile__glyph"
          />
        </span>
        <span className="profile-train-tile__label">{card.title}</span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "profile-train-tile__chevron",
            open && "profile-train-tile__chevron--open"
          )}
        />
      </FastActivateButton>
      {open ? (
        <p id={detailsId} className="profile-train-tile__details">
          {card.description}
        </p>
      ) : null}
    </li>
  );
}

"use client";

import { useId } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { TrainingOptionCard } from "@/lib/profile-details-visual";
import { ProfileTrainingKindIcon } from "./ProfileDetailsIcons";

export function ProfileTrainingOptionRow({
  card,
  open,
  onToggle,
}: {
  card: TrainingOptionCard;
  open: boolean;
  onToggle: () => void;
}) {
  const detailsId = useId();

  return (
    <li className={cn("profile-train-tile", open && "profile-train-tile--open")}>
      <FastActivateButton
        className="smoac-control profile-train-tile__toggle"
        aria-expanded={open}
        aria-controls={detailsId}
        onActivate={onToggle}
      >
        <span className="profile-train-tile__head">
          <span className="profile-train-tile__icon" aria-hidden>
            <ProfileTrainingKindIcon
              kind={card.kind}
              className="profile-train-tile__glyph"
            />
          </span>
          <span className="profile-train-tile__copy">
            <span className="profile-train-tile__label">{card.title}</span>
            <span className="profile-train-tile__summary">{card.description}</span>
          </span>
        </span>
        <span
          id={detailsId}
          className="profile-train-tile__rundown"
          hidden={!open}
        >
          <ul className="profile-train-tile__points">
            {card.points.map((point) => (
              <li key={point}>
                <CheckIcon className="profile-train-tile__check" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </span>
      </FastActivateButton>
    </li>
  );
}

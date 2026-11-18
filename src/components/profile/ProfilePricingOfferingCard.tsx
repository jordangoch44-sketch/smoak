"use client";

import { useId } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CheckIcon } from "@/components/ui/icons";
import { pricingIncludedLines } from "@/lib/specialist-pricing";
import { cn } from "@/lib/utils";
import type { SpecialistPricingOfferingType } from "@/types/specialist-pricing";
import { ProfilePricingKindIcon } from "./ProfileDetailsIcons";

export function ProfilePricingOfferingCard({
  type,
  label,
  kind = "",
  price,
  included,
  commitment,
  open,
  onToggle,
}: {
  type: SpecialistPricingOfferingType;
  label: string;
  kind?: string;
  price: string;
  included: string;
  commitment: string;
  open: boolean;
  onToggle: () => void;
}) {
  const detailsId = useId();
  const points = pricingIncludedLines(included)
    .map((line) => line.trim())
    .filter(Boolean);
  const hasDetails = points.length > 0 || Boolean(commitment);
  const expanded = hasDetails && open;

  const head = (
    <span className="profile-train-tile__head">
      <span className="profile-train-tile__icon" aria-hidden>
        <ProfilePricingKindIcon
          kind={type}
          className="profile-train-tile__glyph"
        />
      </span>
      <span className="profile-train-tile__copy">
        <span className="profile-train-tile__label">{label}</span>
        {kind ? (
          <span className="profile-train-tile__summary">{kind}</span>
        ) : null}
      </span>
    </span>
  );

  const priceLabel = price ? (
    <span className="profile-pricing-card__price" hidden={hasDetails && !expanded}>
      {price}
    </span>
  ) : null;

  const rundown = (
    <span
      id={detailsId}
      className="profile-train-tile__rundown"
      hidden={!expanded}
    >
      {points.length > 0 ? (
        <ul className="profile-train-tile__points">
          {points.map((point, index) => (
            <li key={`${index}-${point}`}>
              <CheckIcon className="profile-train-tile__check" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {commitment ? (
        <p className="profile-pricing-card__commitment">{commitment}</p>
      ) : null}
    </span>
  );

  return (
    <li
      className={cn(
        "profile-train-tile profile-pricing-card",
        expanded && "profile-train-tile--open"
      )}
    >
      {hasDetails ? (
        <FastActivateButton
          className="smoac-control profile-train-tile__toggle profile-pricing-card__toggle"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onActivate={onToggle}
        >
          {head}
          {priceLabel}
          {rundown}
        </FastActivateButton>
      ) : (
        <div className="profile-train-tile__toggle">
          {head}
          {priceLabel}
        </div>
      )}
    </li>
  );
}

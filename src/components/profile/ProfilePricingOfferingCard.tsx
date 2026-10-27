"use client";

import { useId, useLayoutEffect, useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronDownIcon } from "@/components/ui/icons";
import { pricingIncludedLines } from "@/lib/specialist-pricing";
import { cn } from "@/lib/utils";

export function ProfilePricingOfferingCard({
  label,
  kind = "",
  price,
  included,
  commitment,
}: {
  label: string;
  kind?: string;
  price: string;
  included: string;
  commitment: string;
}) {
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const points = pricingIncludedLines(included)
    .map((line) => line.trim())
    .filter(Boolean);
  const hasDetails = points.length > 0 || Boolean(commitment);

  useLayoutEffect(() => {
    setOpen(false);
  }, [included, commitment]);

  const heading = (
    <div className="profile-pricing-card__row">
      <span className="profile-pricing-card__titles">
        <span className="profile-pricing-card__type">{label}</span>
        {kind ? (
          <span className="profile-pricing-card__kind">{kind}</span>
        ) : null}
      </span>
      {price ? (
        <span className="profile-pricing-card__price">{price}</span>
      ) : null}
    </div>
  );

  return (
    <li
      className={cn(
        "profile-pricing-card",
        hasDetails && "profile-pricing-card--fold"
      )}
    >
      {hasDetails ? (
        <FastActivateButton
          className="smoac-control profile-pricing-card__toggle"
          aria-expanded={open}
          aria-controls={detailsId}
          onActivate={() => setOpen((value) => !value)}
        >
          {heading}
          <ChevronDownIcon
            className={cn(
              "profile-pricing-card__chevron",
              open && "profile-pricing-card__chevron--open"
            )}
          />
        </FastActivateButton>
      ) : (
        heading
      )}
      {hasDetails && open ? (
        <div id={detailsId} className="profile-pricing-card__details">
          {points.length > 0 ? (
            <ul className="profile-pricing-card__included">
              {points.map((point, index) => (
                <li key={`${index}-${point}`}>{point}</li>
              ))}
            </ul>
          ) : null}
          {commitment ? (
            <p className="profile-pricing-card__commitment">{commitment}</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

"use client";

import { useId, useLayoutEffect, useState } from "react";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function ProfilePricingOfferingCard({
  label,
  price,
  included,
  commitment,
}: {
  label: string;
  price: string;
  included: string;
  commitment: string;
}) {
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const hasDetails = Boolean(included || commitment);

  useLayoutEffect(() => {
    setOpen(false);
  }, [included, commitment]);

  const heading = (
    <div className="profile-pricing-card__row">
      <span className="profile-pricing-card__type">{label}</span>
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
          {included ? (
            <p className="profile-pricing-card__included">{included}</p>
          ) : null}
          {commitment ? (
            <p className="profile-pricing-card__commitment">{commitment}</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

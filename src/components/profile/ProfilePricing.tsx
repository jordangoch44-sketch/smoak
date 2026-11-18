"use client";

import { useState } from "react";
import type { Trainer } from "@/types";
import {
  INQUIRE_FOR_PRICING_DETAILS,
  PRICING_PACKAGES_SECTION_TITLE,
  formatOfferingPrice,
  publishedPricingOfferings,
  pricingOfferingDisplayName,
  pricingOfferingLabel,
} from "@/lib/specialist-pricing";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";
import { ProfilePricingOfferingCard } from "./ProfilePricingOfferingCard";

export function ProfilePricing({ trainer }: { trainer: Trainer }) {
  const offerings = publishedPricingOfferings(trainer.pricingOfferings);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ProfileSection variant="panel" aria-label={PRICING_PACKAGES_SECTION_TITLE}>
      <ProfileSectionHeader title={PRICING_PACKAGES_SECTION_TITLE} />
      {offerings.length > 0 ? (
        <p className="profile-train-lead">Choose a package:</p>
      ) : null}
      {offerings.length === 0 ? (
        <p className="profile-section-body profile-pricing-inquire">
          {INQUIRE_FOR_PRICING_DETAILS}
        </p>
      ) : (
        <ul className="profile-section-body profile-train-tiles">
          {offerings.map((offering) => {
            const typeLabel = pricingOfferingLabel(offering.type);
            const named = (offering.name ?? "").trim().length > 0;
            return (
              <ProfilePricingOfferingCard
                key={offering.id}
                type={offering.type}
                label={pricingOfferingDisplayName(offering)}
                kind={named ? typeLabel : ""}
                price={formatOfferingPrice(offering)}
                included={offering.included.trim()}
                commitment={offering.commitment.trim()}
                open={openId === offering.id}
                onToggle={() =>
                  setOpenId((current) =>
                    current === offering.id ? null : offering.id
                  )
                }
              />
            );
          })}
        </ul>
      )}
    </ProfileSection>
  );
}

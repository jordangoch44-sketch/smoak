"use client";

import type { ReactNode } from "react";
import type { Trainer } from "@/types";
import type { SpecialistServiceAreaDisplay } from "@/lib/specialist-service-area";
import { buildServiceAreaDisplay } from "@/lib/specialist-service-area";
import {
  HybridFormatIcon,
  InPersonFormatIcon,
  LocationMarkIcon,
  TravelRangeIcon,
  VirtualFormatIcon,
} from "@/components/ui/icons";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface ProfileServiceAreaProps {
  trainer: Trainer;
}

function FormatIcon({
  kind,
}: {
  kind: SpecialistServiceAreaDisplay["serviceTypeIcon"];
}) {
  const className = "profile-service-area__icon";
  switch (kind) {
    case "virtual":
      return <VirtualFormatIcon className={className} />;
    case "hybrid":
      return <HybridFormatIcon className={className} />;
    default:
      return <InPersonFormatIcon className={className} />;
  }
}

function formatBasedInValue(
  trainer: Trainer,
  display: SpecialistServiceAreaDisplay
): string {
  const city = trainer.city.trim();
  const zip = trainer.zipCode?.trim() ?? "";
  if (city && zip) {
    return `${city} • ${zip}`;
  }
  if (zip) {
    return zip;
  }
  return display.basedInLine;
}

interface ServiceAreaFactProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function ServiceAreaFact({ icon, label, value }: ServiceAreaFactProps) {
  return (
    <li className="profile-service-area__fact">
      <span className="profile-service-area__icon-shell" aria-hidden>
        {icon}
      </span>
      <div className="profile-service-area__meta">
        <p className="profile-service-area__label">{label}</p>
        <p className="profile-service-area__value">{value}</p>
      </div>
    </li>
  );
}

export function ProfileServiceArea({ trainer }: ProfileServiceAreaProps) {
  const display = buildServiceAreaDisplay(trainer);
  if (!display) return null;

  const basedInValue = formatBasedInValue(trainer, display);

  return (
    <ProfileSection variant="panel" aria-label="Service area">
      <ProfileSectionHeader title="Service area" />
      <div className="profile-section-body profile-service-area">
        <ul className="profile-service-area__facts">
          <ServiceAreaFact
            icon={<LocationMarkIcon className="profile-service-area__icon" />}
            label="Based in"
            value={basedInValue}
          />

          {display.travelRadiusLine ? (
            <ServiceAreaFact
              icon={<TravelRangeIcon className="profile-service-area__icon" />}
              label="Travel"
              value={display.travelRadiusLine}
            />
          ) : null}

          <ServiceAreaFact
            icon={<FormatIcon kind={display.serviceTypeIcon} />}
            label="Format"
            value={display.serviceTypeLine}
          />
        </ul>

        {display.description ? (
          <p className="profile-service-area__description">{display.description}</p>
        ) : null}
      </div>
    </ProfileSection>
  );
}

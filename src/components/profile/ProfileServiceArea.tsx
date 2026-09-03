"use client";

import type { Trainer } from "@/types";
import { buildLocationTravelDisplay } from "@/lib/specialist-service-area";
import { ProfileLocationFactIcon } from "./ProfileDetailsIcons";
import { ProfileDetailsRadiusMap } from "./ProfileDetailsRadiusMap";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface ProfileServiceAreaProps {
  trainer: Trainer;
}

export function ProfileServiceArea({ trainer }: ProfileServiceAreaProps) {
  const display = buildLocationTravelDisplay(trainer);
  if (!display) return null;

  return (
    <ProfileSection variant="panel" aria-label="Location and travel">
      <ProfileSectionHeader title="Location and travel" />
      <div
        className={
          display.map
            ? "profile-section-body profile-service-area profile-service-area--visual profile-service-area--with-map"
            : "profile-section-body profile-service-area profile-service-area--visual"
        }
      >
        {display.facts.length > 0 ? (
          <ul className="profile-service-area__facts">
            {display.facts.map((fact) => (
              <li key={fact.label} className="profile-service-area__fact">
                <span className="profile-service-area__icon-shell" aria-hidden>
                  <ProfileLocationFactIcon
                    kind={fact.icon}
                    className="profile-service-area__icon"
                  />
                </span>
                <div className="profile-service-area__meta">
                  <p className="profile-service-area__label">{fact.label}</p>
                  <p className="profile-service-area__value">
                    {fact.value.split("\n").map((line) => (
                      <span key={line} className="profile-service-area__value-line">
                        {line}
                      </span>
                    ))}
                  </p>
                  {fact.hint ? (
                    <p className="profile-service-area__hint">{fact.hint}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {display.map ? <ProfileDetailsRadiusMap map={display.map} /> : null}

        {display.description ? (
          <p className="profile-service-area__description">{display.description}</p>
        ) : null}
      </div>
    </ProfileSection>
  );
}

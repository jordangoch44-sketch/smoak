"use client";

import Link from "next/link";
import type { Trainer } from "@/types";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { buildLocationTravelDisplay } from "@/lib/specialist-service-area";
import { cityToSlug, findPathForProfession } from "@/lib/seo/marketplace-slugs";
import { primarySearchPlaces } from "@/lib/seo/specialist-search-places";
import { ProfileLocationFactIcon } from "./ProfileDetailsIcons";
import { ProfileDetailsRadiusMap } from "./ProfileDetailsRadiusMap";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

interface ProfileServiceAreaProps {
  trainer: Trainer;
}

export function ProfileServiceArea({ trainer }: ProfileServiceAreaProps) {
  const display = buildLocationTravelDisplay(trainer);
  const places = primarySearchPlaces(trainer, 6);
  if (!display && places.length === 0) return null;

  const profession =
    resolveTrainerProfessionCategory(trainer) ||
    trainer.profession?.trim() ||
    "Wellness";
  const professionLanding = findPathForProfession(profession);
  const placeList = places.join(", ");

  return (
    <ProfileSection variant="panel" aria-label="Location and travel">
      <ProfileSectionHeader title="Location and travel" />
      <div
        className={
          display?.map
            ? "profile-section-body profile-service-area profile-service-area--visual profile-service-area--with-map"
            : "profile-section-body profile-service-area profile-service-area--visual"
        }
      >
        {display && display.facts.length > 0 ? (
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
                  {fact.parenthetical ? (
                    <p className="profile-service-area__parenthetical">
                      {fact.parenthetical}
                    </p>
                  ) : null}
                  {fact.hint ? (
                    <p className="profile-service-area__hint">{fact.hint}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {display?.map ? <ProfileDetailsRadiusMap map={display.map} /> : null}

        {places.length > 0 ? (
          <div className="profile-service-area__search">
            <p className="profile-service-area__search-line">
              {profession} in {placeList}.
            </p>
            <nav aria-label={`${profession} by location`}>
              <ul className="profile-service-area__search-links">
                {places.map((place) => {
                  const href = professionLanding
                    ? `/find/${cityToSlug(place)}/${professionLanding.slug}`
                    : `/find/${cityToSlug(place)}`;
                  const label = professionLanding
                    ? `${professionLanding.pluralLabel} in ${place}`
                    : `${profession} in ${place}`;
                  return (
                    <li key={place}>
                      <Link href={href}>{label}</Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        ) : null}
      </div>
    </ProfileSection>
  );
}

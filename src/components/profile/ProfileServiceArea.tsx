"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Trainer } from "@/types";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import {
  buildLocationTravelDisplay,
  type LocationTravelFact,
} from "@/lib/specialist-service-area";
import { cityToSlug, findPathForProfession } from "@/lib/seo/marketplace-slugs";
import { primaryBasedSearchPlaces } from "@/lib/seo/specialist-search-places";
import { ProfileLocationFactIcon } from "./ProfileDetailsIcons";
import { ProfileDetailsRadiusMap } from "./ProfileDetailsRadiusMap";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";

/** Longer values clamp to a few lines; full text stays in the DOM for search. */
const CLAMP_VALUE_MIN_CHARS = 200;

interface ProfileServiceAreaProps {
  trainer: Trainer;
}

function ServiceAreaFactValue({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const clampRef = useRef<HTMLParagraphElement>(null);
  const clampable = value.length >= CLAMP_VALUE_MIN_CHARS;

  useEffect(() => {
    const el = clampRef.current;
    if (!el || expanded) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, value]);

  if (!clampable || expanded) {
    return (
      <>
        <p className="profile-service-area__value">
          {value.split("\n").map((line) => (
            <span key={line} className="profile-service-area__value-line">
              {line}
            </span>
          ))}
        </p>
        {clampable ? (
          <button
            type="button"
            className="profile-service-area__more"
            aria-expanded
            onClick={() => setExpanded(false)}
          >
            Show less
          </button>
        ) : null}
      </>
    );
  }

  return (
    <>
      <p
        ref={clampRef}
        className="profile-service-area__value profile-service-area__value--clamped"
      >
        {value.replace(/\s*\n+\s*/g, " ")}
      </p>
      {overflowing ? (
        <button
          type="button"
          className="profile-service-area__more"
          aria-expanded={false}
          onClick={() => setExpanded(true)}
        >
          Read more
        </button>
      ) : null}
    </>
  );
}

export function ProfileServiceArea({ trainer }: ProfileServiceAreaProps) {
  const display = buildLocationTravelDisplay(trainer);
  const places = primaryBasedSearchPlaces(trainer, 6);
  if (!display && places.length === 0) return null;

  const profession =
    resolveTrainerProfessionCategory(trainer) ||
    trainer.profession?.trim() ||
    "Wellness";
  const professionLanding = findPathForProfession(profession);
  const professionLabel = professionLanding?.pluralLabel ?? profession;

  return (
    <ProfileSection variant="panel" aria-label="Location and travel">
      <ProfileSectionHeader title="Location and travel" />
      <div className="profile-section-body profile-service-area profile-service-area--visual">
        {display && display.facts.length > 0 ? (
          <ul className="profile-service-area__facts">
            {display.facts.map((fact: LocationTravelFact) => (
              <li key={fact.label} className="profile-service-area__fact">
                <span className="profile-service-area__icon-shell" aria-hidden>
                  <ProfileLocationFactIcon
                    kind={fact.icon}
                    className="profile-service-area__icon"
                  />
                </span>
                <div className="profile-service-area__meta">
                  <p className="profile-service-area__label">{fact.label}</p>
                  <ServiceAreaFactValue value={fact.value} />
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
          <nav
            className="profile-service-area__search"
            aria-label={`${professionLabel} by location`}
          >
            <h3 className="profile-service-area__search-title">
              {professionLabel} near
            </h3>
            <ul className="profile-service-area__search-links">
              {places.map((place) => {
                const href = professionLanding
                  ? `/find/${cityToSlug(place)}/${professionLanding.slug}`
                  : `/find/${cityToSlug(place)}`;
                return (
                  <li key={place}>
                    <Link href={href} aria-label={`${professionLabel} in ${place}`}>
                      {place}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </div>
    </ProfileSection>
  );
}

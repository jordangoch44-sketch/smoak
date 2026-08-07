"use client";

import { useId, useState } from "react";
import type { Trainer } from "@/types";
import { cn } from "@/lib/utils";
import { Bio } from "./Bio";
import { Certifications } from "./Certifications";
import { ProfileResultsSnapshot } from "./ProfileResultsSnapshot";
import { ProfileServiceArea } from "./ProfileServiceArea";
import { ProfileSessionExperience } from "./ProfileSessionExperience";
import { ProfilePillGrid } from "./ProfilePillGrid";
import { ProfileSection } from "./ProfileSection";
import { ProfileSectionHeader } from "./ProfileSectionHeader";
import { SocialLinks } from "./SocialLinks";

interface ProfileTrainerSpecsProps {
  trainer: Trainer;
}

function nonEmptyStrings(items: string[] | null | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => typeof item === "string" && item.trim().length > 0);
}

export function ProfileTrainerSpecs({ trainer }: ProfileTrainerSpecsProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const bestForItems = nonEmptyStrings(trainer.bestFor);
  const coachingStyleItems = nonEmptyStrings(trainer.coachingStyle);
  const showBestFor = bestForItems.length > 0;
  const showCoachingStyle = coachingStyleItems.length > 0;

  const hasAnySpecsContent =
    showBestFor ||
    showCoachingStyle ||
    Boolean(trainer.bio?.trim()) ||
    nonEmptyStrings(trainer.specialty).length > 0 ||
    nonEmptyStrings(trainer.sessionExperience).length > 0 ||
    nonEmptyStrings(trainer.resultsSnapshot ?? []).length > 0 ||
    (Array.isArray(trainer.certifications) &&
      trainer.certifications.some(
        (cert) => cert && typeof cert.name === "string" && cert.name.trim().length > 0
      )) ||
    (trainer.social &&
      Object.values(trainer.social).some(
        (url) => typeof url === "string" && url.trim().length > 0
      )) ||
    Boolean(trainer.city?.trim()) ||
    Boolean(trainer.zipCode?.trim());

  if (!hasAnySpecsContent) return null;

  return (
    <section className="profile-trainer-specs" aria-label="Full specialist profile">
      <button
        type="button"
        className="smoac-control profile-trainer-specs__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="profile-trainer-specs__trigger-copy">
          <span className="profile-trainer-specs__eyebrow">Details</span>
          <span className="profile-trainer-specs__title">
            {open ? "Hide full profile" : "View full profile"}
          </span>
          <span className="profile-trainer-specs__subtitle">
            Service area, style, certifications, session experience, and more
          </span>
        </span>
        <span
          className={cn(
            "profile-trainer-specs__chevron",
            open && "profile-trainer-specs__chevron--open"
          )}
          aria-hidden
        >
          ›
        </span>
      </button>

      <div
        id={panelId}
        className={cn(
          "profile-trainer-specs__panel",
          open && "profile-trainer-specs__panel--open"
        )}
        hidden={!open}
      >
        <div className="profile-trainer-specs__stack">
          <ProfileServiceArea trainer={trainer} />

          {showBestFor ? (
            <ProfileSection variant="panel" aria-label="Best for">
              <ProfileSectionHeader title="Best for" />
              <div className="profile-section-body">
                <ProfilePillGrid items={bestForItems} />
              </div>
            </ProfileSection>
          ) : null}

          {showCoachingStyle ? (
            <ProfileSection variant="panel" aria-label="Coaching style">
              <ProfileSectionHeader title="Coaching style" />
              <div className="profile-section-body">
                <ProfilePillGrid items={coachingStyleItems} />
              </div>
            </ProfileSection>
          ) : null}

          <ProfileSessionExperience trainer={trainer} />
          <ProfileResultsSnapshot trainer={trainer} />
          <Certifications certifications={trainer.certifications} />
          <Bio trainer={trainer} />
          <SocialLinks social={trainer.social} />
        </div>
      </div>
    </section>
  );
}

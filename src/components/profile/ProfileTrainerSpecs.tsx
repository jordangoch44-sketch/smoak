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

export function ProfileTrainerSpecs({ trainer }: ProfileTrainerSpecsProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

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

          <ProfileSection variant="panel" aria-label="Best for">
            <ProfileSectionHeader title="Best for" />
            <div className="profile-section-body">
              <ProfilePillGrid items={trainer.bestFor} />
            </div>
          </ProfileSection>

          <ProfileSection variant="panel" aria-label="Coaching style">
            <ProfileSectionHeader title="Coaching style" />
            <div className="profile-section-body">
              <ProfilePillGrid items={trainer.coachingStyle} />
            </div>
          </ProfileSection>

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

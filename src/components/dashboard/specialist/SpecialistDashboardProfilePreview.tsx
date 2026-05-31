"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { SpecialistApplication } from "@/types/specialist-application";
import type { Trainer } from "@/types/trainer";
import { buildServiceAreaDisplay } from "@/lib/specialist-service-area";
import { cn } from "@/lib/utils";

const EDIT_PROFILE_PATH = "/specialist-dashboard/edit-profile";

interface SpecialistDashboardProfilePreviewProps {
  application: SpecialistApplication;
  trainer: Trainer;
  editable?: boolean;
}

interface ProfileSectionProps {
  label: string;
  href: string;
  editable: boolean;
  children: ReactNode;
  className?: string;
}

function ProfileSection({
  label,
  href,
  editable,
  children,
  className,
}: ProfileSectionProps) {
  const content = (
    <>
      <p className="specialist-dash-profile__label">{label}</p>
      {children}
    </>
  );

  if (!editable) {
    return (
      <div className={cn("specialist-dash-profile__section", className)}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "specialist-dash-profile__section specialist-dash-profile__section--editable",
        className
      )}
    >
      {content}
    </Link>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="specialist-dash-profile__placeholder">{children}</p>
  );
}

export function SpecialistDashboardProfilePreview({
  application,
  trainer,
  editable = false,
}: SpecialistDashboardProfilePreviewProps) {
  const serviceArea = buildServiceAreaDisplay(trainer);
  const photo =
    application.media.profilePhotoUrl.trim() ||
    trainer.image?.trim() ||
    trainer.heroImage?.trim() ||
    "";
  const coachingPhilosophy = application.coachingPhilosophy.trim();
  const idealClients = application.bestClientTypes.trim();
  const locationLine = [application.neighborhood, application.city, application.state]
    .filter(Boolean)
    .join(", ");
  const zipLine = application.zipCode.trim();
  const socialLinks = [
    application.social.instagram,
    application.social.website,
    application.social.googleReviewsUrl,
  ].filter(Boolean);

  return (
    <article className="specialist-dash-profile" aria-label="Profile preview">
      <ProfileSection
        label="Profile photo"
        href={`${EDIT_PROFILE_PATH}#basic-info`}
        editable={editable}
        className="specialist-dash-profile__section--hero"
      >
        <div className="specialist-dash-profile__hero">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="specialist-dash-profile__photo" />
          ) : (
            <div className="specialist-dash-profile__photo specialist-dash-profile__photo--placeholder" />
          )}
          <div className="specialist-dash-profile__hero-copy">
            <p className="specialist-dash-profile__name">
              {trainer.name || "Add name"}
            </p>
            <p className="specialist-dash-profile__headline">
              {trainer.title || "Add headline"}
            </p>
            <p className="specialist-dash-profile__meta">
              {trainer.profession || "Add profession"}
              {locationLine ? ` · ${locationLine}` : ""}
            </p>
          </div>
        </div>
      </ProfileSection>

      <ProfileSection
        label="Specialties"
        href={`${EDIT_PROFILE_PATH}#specialties`}
        editable={editable}
      >
        {trainer.specialty.length > 0 ? (
          <div className="specialist-dash-profile__pills">
            {trainer.specialty.slice(0, 8).map((item) => (
              <span key={item} className="specialist-dash-profile__pill">
                {item}
              </span>
            ))}
          </div>
        ) : (
          <Placeholder>Add specialties</Placeholder>
        )}
      </ProfileSection>

      <ProfileSection
        label="Bio"
        href={`${EDIT_PROFILE_PATH}#bio`}
        editable={editable}
      >
        {trainer.bio.trim() ? (
          <p className="specialist-dash-profile__bio">{trainer.bio}</p>
        ) : (
          <Placeholder>Add bio</Placeholder>
        )}
      </ProfileSection>

      <ProfileSection
        label="Coaching philosophy"
        href={`${EDIT_PROFILE_PATH}#experience`}
        editable={editable}
      >
        {coachingPhilosophy ? (
          <p className="specialist-dash-profile__bio">{coachingPhilosophy}</p>
        ) : (
          <Placeholder>Add coaching philosophy</Placeholder>
        )}
      </ProfileSection>

      <ProfileSection
        label="Ideal clients"
        href={`${EDIT_PROFILE_PATH}#experience`}
        editable={editable}
      >
        {idealClients ? (
          <p className="specialist-dash-profile__bio">{idealClients}</p>
        ) : (
          <Placeholder>Add ideal clients</Placeholder>
        )}
      </ProfileSection>

      <ProfileSection
        label="Service area"
        href={`${EDIT_PROFILE_PATH}#service-area`}
        editable={editable}
      >
        {serviceArea ? (
          <p className="specialist-dash-profile__meta">
            Based in {serviceArea.basedInLine}
            {serviceArea.travelRadiusLine
              ? ` · ${serviceArea.travelRadiusLine} travel`
              : ""}
            {" · "}
            {serviceArea.serviceTypeLine}
          </p>
        ) : (
          <Placeholder>Add service area</Placeholder>
        )}
      </ProfileSection>

      <ProfileSection
        label="Location"
        href={`${EDIT_PROFILE_PATH}#service-area`}
        editable={editable}
      >
        {locationLine || zipLine ? (
          <p className="specialist-dash-profile__meta">
            {[locationLine, zipLine ? `ZIP ${zipLine}` : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : (
          <Placeholder>Add city, neighborhood, and ZIP code</Placeholder>
        )}
      </ProfileSection>

      <ProfileSection
        label="Credentials"
        href={`${EDIT_PROFILE_PATH}#credentials`}
        editable={editable}
      >
        {trainer.certifications.length > 0 ? (
          <ul className="specialist-dash-profile__list">
            {trainer.certifications.slice(0, 4).map((cert) => (
              <li key={`${cert.name}-${cert.year}`}>
                {cert.name}
                {cert.issuer ? ` · ${cert.issuer}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <Placeholder>Add credentials</Placeholder>
        )}
      </ProfileSection>

      <ProfileSection
        label="Social & review links"
        href={`${EDIT_PROFILE_PATH}#photos-links`}
        editable={editable}
      >
        {socialLinks.length > 0 ? (
          <p className="specialist-dash-profile__meta specialist-dash-profile__meta--links">
            {socialLinks.join(" · ")}
          </p>
        ) : (
          <Placeholder>Add social or review links</Placeholder>
        )}
      </ProfileSection>
    </article>
  );
}

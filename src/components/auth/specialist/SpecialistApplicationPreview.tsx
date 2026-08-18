"use client";

import type { SpecialistOnboardingState } from "@/types/specialist-application";
import { applicationToPreviewTrainer } from "@/lib/application-to-trainer";
import { buildServiceAreaDisplay } from "@/lib/specialist-service-area";

interface SpecialistApplicationPreviewProps {
  state: SpecialistOnboardingState;
  onEditCrop?: () => void;
}

export function SpecialistApplicationPreview({
  state,
  onEditCrop,
}: SpecialistApplicationPreviewProps) {
  const preview = applicationToPreviewTrainer(state);
  const serviceArea = buildServiceAreaDisplay(preview);
  const photo = state.media.profilePhotoUrl.trim();

  return (
    <div className="wizard-profile-preview">
      <div className="wizard-profile-preview__hero">
        <div className="wizard-profile-preview__photo-wrap">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="wizard-profile-preview__photo"
            />
          ) : (
            <div className="wizard-profile-preview__photo wizard-profile-preview__photo--placeholder" />
          )}
          {onEditCrop ? (
            <button
              type="button"
              className="wizard-edit-crop-link"
              onClick={onEditCrop}
            >
              Edit Crop
            </button>
          ) : null}
        </div>
        <div className="wizard-profile-preview__hero-copy">
          <p className="wizard-profile-preview__name">{preview.name}</p>
          <p className="wizard-profile-preview__headline">{preview.title}</p>
          <p className="wizard-profile-preview__meta">
            {preview.profession} · {preview.location}
            {state.gender === "male"
              ? " · Male"
              : state.gender === "female"
                ? " · Female"
                : ""}
          </p>
        </div>
      </div>

      {serviceArea ? (
        <div className="wizard-profile-preview__section">
          <p className="wizard-profile-preview__label">Service area</p>
          <p className="wizard-profile-preview__meta">
            Based in {serviceArea.basedInLine}
            {serviceArea.travelRadiusLine
              ? ` · ${serviceArea.travelRadiusLine} travel`
              : ""
            }
            {" · "}
            {serviceArea.serviceTypeLine}
          </p>
        </div>
      ) : null}

      <div className="wizard-profile-preview__section">
        <p className="wizard-profile-preview__label">Specialties</p>
        <div className="wizard-pill-grid wizard-profile-preview__pills">
          {preview.specialty.slice(0, 6).map((item) => (
            <span key={item} className="wizard-pill wizard-pill--active">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="wizard-profile-preview__row">
        <span className="wizard-profile-preview__label">1-on-1</span>
        <span className="wizard-profile-preview__value">
          {state.pricing.oneOnOnePrice.trim()
            ? state.pricing.oneOnOnePrice
            : "Add after approval"}
        </span>
      </div>

      {state.pricing.onlineCoachingPrice ? (
        <div className="wizard-profile-preview__row">
          <span className="wizard-profile-preview__label">Online</span>
          <span className="wizard-profile-preview__value">
            {state.pricing.onlineCoachingPrice}
          </span>
        </div>
      ) : null}

      <div className="wizard-profile-preview__section">
        <p className="wizard-profile-preview__label">Bio</p>
        <p className="wizard-profile-preview__bio">
          {preview.bio.slice(0, 220)}
          {preview.bio.length > 220 ? "…" : ""}
        </p>
      </div>

      {preview.certifications.length > 0 ? (
        <div className="wizard-profile-preview__section">
          <p className="wizard-profile-preview__label">Certifications</p>
          <ul className="wizard-profile-preview__list">
            {preview.certifications.slice(0, 3).map((cert) => (
              <li key={`${cert.name}-${cert.year}`}>
                {cert.name} · {cert.issuer}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(state.social.instagram || state.social.website) && (
        <div className="wizard-profile-preview__row">
          <span className="wizard-profile-preview__label">Links</span>
          <span className="wizard-profile-preview__value wizard-profile-preview__value--links">
            {[state.social.instagram, state.social.website]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      )}
    </div>
  );
}

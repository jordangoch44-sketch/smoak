"use client";

import { memo } from "react";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { applicationStatusLabel } from "@/lib/admin-applications-service";
import { canonicalizeProfessionLabel } from "@/lib/profession-category";
import { isSpecialistReadyToGoLive } from "@/lib/specialist-go-live-gate";
import type { SpecialistApplication } from "@/types/specialist-application";

interface AdminApplicationCardProps {
  application: SpecialistApplication;
  isSelected?: boolean;
  onSelect: () => void;
}

function formatSubmittedDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return "SP";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const AdminApplicationCard = memo(function AdminApplicationCard({
  application,
  isSelected = false,
  onSelect,
}: AdminApplicationCardProps) {
  const statusLabel = applicationStatusLabel(application.profileStatus);
  const displayName =
    application.businessName ||
    application.displayName ||
    application.fullName ||
    "Specialist Applicant";

  const initials = getInitials(
    application.displayName || application.fullName || application.businessName
  );

  const photoUrl = application.media?.profilePhotoUrl;
  const isReady = isSpecialistReadyToGoLive(application);

  const locationText = [
    application.neighborhood,
    application.city,
    application.state,
  ]
    .filter(Boolean)
    .join(", ") || application.zipCode || "Location not set";

  const priceText = application.pricing?.oneOnOnePrice
    ? `$${application.pricing.oneOnOnePrice}/hr`
    : application.pricing?.packageOptions
      ? "Packages"
      : application.pricing?.onlineCoachingPrice
        ? `$${application.pricing.onlineCoachingPrice}/mo`
        : null;

  const serviceMode =
    application.serviceType === "both"
      ? "In-Person & Virtual"
      : application.serviceType === "virtual"
        ? "Virtual Only"
        : application.serviceType === "in-person"
          ? "In-Person"
          : null;

  return (
    <li className="admin-app-card-wrapper">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`admin-app-card${isSelected ? " admin-app-card--selected" : ""}`}
        aria-label={`Review application for ${displayName}`}
      >
        {/* Top Header: Avatar + Identity + Status */}
        <div className="admin-app-card__header">
          <div className="admin-app-card__identity-group">
            {/* Avatar with fallback */}
            <div className="admin-app-card__avatar">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt=""
                  className="admin-app-card__avatar-img"
                  loading="lazy"
                />
              ) : (
                <div className="admin-app-card__avatar-initials">
                  {initials}
                </div>
              )}
            </div>

            {/* Name + Headline + Micro Badges */}
            <div className="admin-app-card__identity">
              <div className="admin-app-card__title-row">
                <h3 className="admin-app-card__title">{displayName}</h3>
                {application.foundingInvite ? (
                  <span className="admin-app-card__tag admin-app-card__tag--founding">
                    Founding 50
                  </span>
                ) : null}
              </div>

              <div className="admin-app-card__sub-row">
                <span className="admin-app-card__profession">
                  {canonicalizeProfessionLabel(application.professionalType) ||
                    application.professionalType ||
                    "Specialist"}
                </span>
                {application.headline ? (
                  <>
                    <span className="admin-app-card__dot" aria-hidden="true">
                      •
                    </span>
                    <span className="admin-app-card__headline">
                      {application.headline}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Status & Readiness */}
          <div className="admin-app-card__status-stack">
            <AdminStatusBadge label={statusLabel} />
            {isReady ? (
              <span
                className="admin-app-card__readiness admin-app-card__readiness--ready"
                title="Application has all required fields to go live upon approval"
              >
                <span className="admin-app-card__readiness-dot" />
                Go-Live Ready
              </span>
            ) : (
              <span
                className="admin-app-card__readiness admin-app-card__readiness--pending"
                title="Submitted, but still missing info required to go live"
              >
                <span className="admin-app-card__readiness-dot" />
                Needs info
              </span>
            )}
          </div>
        </div>

        {/* Metadata Grid (4-col desktop / 1-col on small phones) */}
        <div className="admin-app-card__grid">
          <div className="admin-app-card__cell">
            <span className="admin-app-card__label">Location</span>
            <span className="admin-app-card__value" title={locationText}>
              <svg
                className="admin-app-card__cell-icon"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 17.5s-5.833-5.25-5.833-9.167a5.833 5.833 0 1111.666 0C15.833 12.25 10 17.5 10 17.5z"
                />
                <circle cx="10" cy="8.333" r="2.5" />
              </svg>
              {locationText}
            </span>
          </div>

          <div className="admin-app-card__cell">
            <span className="admin-app-card__label">Email</span>
            <span className="admin-app-card__value" title={application.email}>
              <svg
                className="admin-app-card__cell-icon"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.333 5.833h13.334a1.667 1.667 0 011.666 1.667v8.333a1.667 1.667 0 01-1.666 1.667H3.333A1.667 1.667 0 011.667 15.833V7.5a1.667 1.667 0 011.666-1.667z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.333 7.5L10 12.5 1.667 7.5"
                />
              </svg>
              {application.email}
            </span>
          </div>

          <div className="admin-app-card__cell">
            <span className="admin-app-card__label">Rate & Delivery</span>
            <span className="admin-app-card__value">
              <svg
                className="admin-app-card__cell-icon"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 2.5v15M13.333 5.833H8.75a2.5 2.5 0 000 5h2.5a2.5 2.5 0 010 5H6.667"
                />
              </svg>
              {priceText || "Rate pending"}
              {serviceMode ? ` • ${serviceMode}` : ""}
            </span>
          </div>

          <div className="admin-app-card__cell">
            <span className="admin-app-card__label">Submitted</span>
            <span className="admin-app-card__value">
              <svg
                className="admin-app-card__cell-icon"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.667 2.5v3.333M13.333 2.5v3.333M2.5 7.5h15M3.333 4.167h13.334a1.667 1.667 0 011.666 1.666v10.834a1.667 1.667 0 01-1.666 1.666H3.333A1.667 1.667 0 011.667 16.667V5.833a1.667 1.667 0 011.666-1.666z"
                />
              </svg>
              {formatSubmittedDate(application.submittedAt)}
            </span>
          </div>
        </div>

        {/* Footer with Specialties & Action Button */}
        <div className="admin-app-card__footer">
          <div className="admin-app-card__tags">
            {application.specialties && application.specialties.length > 0 ? (
              application.specialties.slice(0, 3).map((tag) => (
                <span key={tag} className="admin-app-card__pill">
                  {tag}
                </span>
              ))
            ) : (
              <span className="admin-app-card__empty-tags">
                No specialties listed
              </span>
            )}
            {application.specialties && application.specialties.length > 3 ? (
              <span className="admin-app-card__pill admin-app-card__pill--more">
                +{application.specialties.length - 3} more
              </span>
            ) : null}
          </div>

          <div className="admin-app-card__action">
            <span className="admin-app-card__review-btn">
              Review Application
              <svg
                className="admin-app-card__review-chevron"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12l4-4-4-4"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </li>
  );
});

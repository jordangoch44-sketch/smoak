"use client";

import { memo } from "react";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { clientApplicationStatusLabel } from "@/lib/client-applications-service";
import type { ClientApplication } from "@/types/client-application";

interface AdminClientApplicationCardProps {
  application: ClientApplication;
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
  if (!name || !name.trim()) return "CL";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const AdminClientApplicationCard = memo(function AdminClientApplicationCard({
  application,
  isSelected = false,
  onSelect,
}: AdminClientApplicationCardProps) {
  const statusLabel = clientApplicationStatusLabel(application.status);
  const initials = getInitials(application.fullName);

  const locationText = [
    application.preferredNeighborhood,
    application.preferredCity,
  ]
    .filter(Boolean)
    .join(", ") || application.preferredZipCode || "Location not set";

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
        className={`admin-app-card admin-app-card--client${isSelected ? " admin-app-card--selected" : ""}`}
        aria-label={`Review client questionnaire for ${application.fullName}`}
      >
        {/* Top Header: Avatar + Identity + Status */}
        <div className="admin-app-card__header">
          <div className="admin-app-card__identity-group">
            {/* Avatar Initials */}
            <div className="admin-app-card__avatar admin-app-card__avatar--client">
              <div className="admin-app-card__avatar-initials">
                {initials}
              </div>
            </div>

            {/* Name + Subtitle */}
            <div className="admin-app-card__identity">
              <div className="admin-app-card__title-row">
                <h3 className="admin-app-card__title">{application.fullName}</h3>
                <span className="admin-app-card__tag admin-app-card__tag--client">
                  Client Questionnaire
                </span>
              </div>

              <div className="admin-app-card__sub-row">
                <span className="admin-app-card__profession">
                  Seeking Specialist Match
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="admin-app-card__status-stack">
            <AdminStatusBadge label={statusLabel} />
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="admin-app-card__grid">
          <div className="admin-app-card__cell">
            <span className="admin-app-card__label">Preferred Location</span>
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
            <span className="admin-app-card__label">Budget / Plan</span>
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
              {application.budget || "Flexible budget"}
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

        {/* Footer with Goals & Action Button */}
        <div className="admin-app-card__footer">
          <div className="admin-app-card__tags">
            {application.fitnessGoals && application.fitnessGoals.length > 0 ? (
              application.fitnessGoals.slice(0, 3).map((goal) => (
                <span key={goal} className="admin-app-card__pill admin-app-card__pill--goal">
                  {goal}
                </span>
              ))
            ) : (
              <span className="admin-app-card__empty-tags">
                General fitness match
              </span>
            )}
            {application.fitnessGoals && application.fitnessGoals.length > 3 ? (
              <span className="admin-app-card__pill admin-app-card__pill--more">
                +{application.fitnessGoals.length - 3} more
              </span>
            ) : null}
          </div>

          <div className="admin-app-card__action">
            <span className="admin-app-card__review-btn">
              Review Questionnaire
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

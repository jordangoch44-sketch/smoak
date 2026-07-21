"use client";

import { useEffect, useState } from "react";
import { useSyncedState } from "@/hooks/useSyncedState";
import { createPortal } from "react-dom";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { applicationStatusLabel } from "@/lib/admin-applications-service";
import type { AdminPermissions } from "@/types/admin-permissions";
import type { SpecialistApplication } from "@/types/specialist-application";

type ReviewFeedback =
  | "saved"
  | "approved"
  | "rejected"
  | "activated"
  | "archived"
  | "error"
  | null;

function formatSubmittedDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function servicesSummary(app: SpecialistApplication): string {
  const parts = [
    app.pricing.oneOnOnePrice,
    app.pricing.onlineCoachingPrice,
    app.pricing.packageOptions,
  ].filter(Boolean);
  return parts.join(" · ") || "—";
}

type SpecialistAppAction = (
  app: SpecialistApplication
) =>
  | SpecialistApplication
  | null
  | Promise<SpecialistApplication | null>;

interface AdminApplicationReviewPanelProps {
  application: SpecialistApplication;
  permissions: AdminPermissions;
  onClose: () => void;
  onSave: SpecialistAppAction;
  onApprove: SpecialistAppAction;
  onReject: SpecialistAppAction;
  onActivate: SpecialistAppAction;
  onArchive: SpecialistAppAction;
}

export function AdminApplicationReviewPanel({
  application,
  permissions,
  onClose,
  onSave,
  onApprove,
  onReject,
  onActivate,
  onArchive,
}: AdminApplicationReviewPanelProps) {
  const [draft, setDraft] = useSyncedState(application.id, application);
  const [feedback, setFeedback] = useState<ReviewFeedback>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "save" | "approve" | "reject" | "activate" | "archive" | null
  >(null);

  const statusLabel = applicationStatusLabel(draft.profileStatus);
  const canAct = permissions.canApproveApplications;

  useEffect(() => {
    document.body.classList.add("admin-review-open");
    return () => document.body.classList.remove("admin-review-open");
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function patch<K extends keyof SpecialistApplication>(
    key: K,
    value: SpecialistApplication[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setFeedback(null);
  }

  function patchPricing(
    key: keyof SpecialistApplication["pricing"],
    value: string | boolean
  ) {
    setDraft((prev) => ({
      ...prev,
      pricing: { ...prev.pricing, [key]: value },
    }));
    setFeedback(null);
  }

  function patchSocial(
    key: keyof SpecialistApplication["social"],
    value: string
  ) {
    setDraft((prev) => ({
      ...prev,
      social: { ...prev.social, [key]: value },
    }));
    setFeedback(null);
  }

  function applyResult(
    result: SpecialistApplication | null,
    nextFeedback: ReviewFeedback
  ) {
    if (!result) return;
    setDraft(result);
    setFeedback(nextFeedback);
    setErrorMessage(null);
  }

  async function handleSave() {
    setBusyAction("save");
    setErrorMessage(null);
    try {
      const result = await onSave(draft);
      if (result) {
        applyResult(result, "saved");
      } else {
        setFeedback("error");
        setErrorMessage("Unable to save application.");
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleApprove() {
    setBusyAction("approve");
    setErrorMessage(null);
    try {
      const result = await onApprove(draft);
      if (result) {
        applyResult(result, "approved");
        /* Let the confirmation register, then close so the list + specialist
         * count visibly update behind the sheet. */
        window.setTimeout(() => onClose(), 1600);
      } else {
        setFeedback("error");
        setErrorMessage("Unable to approve application.");
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReject() {
    setBusyAction("reject");
    setErrorMessage(null);
    try {
      const result = await onReject(draft);
      if (result) {
        setDraft(result);
        setFeedback("rejected");
        window.setTimeout(() => onClose(), 400);
      } else {
        setFeedback("error");
        setErrorMessage("Unable to reject application.");
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleActivate() {
    setBusyAction("activate");
    setErrorMessage(null);
    try {
      const result = await onActivate(draft);
      if (result) {
        setDraft(result);
        setFeedback("activated");
        window.setTimeout(() => onClose(), 500);
      } else {
        setFeedback("error");
        setErrorMessage("Unable to activate specialist.");
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleArchive() {
    setBusyAction("archive");
    setErrorMessage(null);
    try {
      const result = await onArchive(draft);
      if (result) {
        setDraft(result);
        setFeedback("archived");
        window.setTimeout(() => onClose(), 400);
      } else {
        setFeedback("error");
        setErrorMessage("Unable to archive application.");
      }
    } finally {
      setBusyAction(null);
    }
  }

  const feedbackMessage =
    feedback === "saved"
      ? "Edits saved."
      : feedback === "approved"
        ? `✓ Approved — ${draft.displayName || draft.fullName} is now a live specialist.`
        : feedback === "rejected"
          ? "Application rejected — removed from public catalog."
          : feedback === "activated"
            ? "Specialist is active on the public catalog."
            : feedback === "archived"
              ? "Application archived — removed from public catalog."
              : feedback === "error"
                ? errorMessage ?? "Something went wrong. Try again."
                : null;

  const feedbackTone =
    feedback === "approved" || feedback === "activated"
      ? "admin-review-sheet__feedback--success"
      : feedback === "error"
        ? "admin-review-sheet__feedback--error"
        : null;

  const sheet = (
    <div
      className="admin-review-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-review-sheet-title"
    >
      <button
        type="button"
        className="admin-review-sheet__backdrop smoac-control"
        aria-label="Close review"
        onClick={onClose}
      />
      <div className="admin-review-sheet__panel">
        <header className="admin-review-sheet__header">
          <div>
            <p className="admin-review-sheet__eyebrow">Application review</p>
            <h2 className="admin-review-sheet__title" id="admin-review-sheet-title">
              {draft.displayName || draft.fullName}
            </h2>
            <p className="admin-review-sheet__sub">
              Submitted {formatSubmittedDate(draft.submittedAt)}
            </p>
          </div>
          <div className="admin-review-sheet__header-actions">
            <AdminStatusBadge label={statusLabel} />
            <button
              type="button"
              className="admin-btn smoac-control"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </header>

        <div className="admin-review-sheet__body">
          <details className="admin-review-section" open>
            <summary>Contact & identity</summary>
            <div className="admin-review-fields">
              <label className="admin-field-label">
                Full name
                <input
                  className="admin-field"
                  value={draft.fullName}
                  onChange={(e) => patch("fullName", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Display name
                <input
                  className="admin-field"
                  value={draft.displayName}
                  onChange={(e) => patch("displayName", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Email
                <input
                  className="admin-field"
                  type="email"
                  value={draft.email}
                  onChange={(e) => patch("email", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Phone
                <input
                  className="admin-field"
                  value={draft.phone}
                  onChange={(e) => patch("phone", e.target.value)}
                />
              </label>
            </div>
          </details>

          <details className="admin-review-section" open>
            <summary>Service area</summary>
            <div className="admin-review-fields">
              <label className="admin-field-label">
                ZIP code
                <input
                  className="admin-field"
                  inputMode="numeric"
                  maxLength={5}
                  value={draft.zipCode}
                  onChange={(e) =>
                    patch("zipCode", e.target.value.replace(/\D/g, "").slice(0, 5))
                  }
                />
              </label>
              <label className="admin-field-label">
                City
                <input
                  className="admin-field"
                  value={draft.city}
                  onChange={(e) => patch("city", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                State
                <input
                  className="admin-field"
                  maxLength={2}
                  value={draft.state}
                  onChange={(e) =>
                    patch("state", e.target.value.toUpperCase().slice(0, 2))
                  }
                />
              </label>
              <label className="admin-field-label">
                Neighborhood
                <input
                  className="admin-field"
                  value={draft.neighborhood}
                  onChange={(e) => patch("neighborhood", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Service type
                <select
                  className="admin-field"
                  value={draft.serviceType}
                  onChange={(e) =>
                    patch(
                      "serviceType",
                      e.target.value as SpecialistApplication["serviceType"]
                    )
                  }
                >
                  <option value="">—</option>
                  <option value="in-person">In-Person</option>
                  <option value="virtual">Virtual</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <label className="admin-field-label">
                Travel radius
                <select
                  className="admin-field"
                  value={draft.travelRadius}
                  onChange={(e) => patch("travelRadius", e.target.value)}
                >
                  <option value="">—</option>
                  <option value="5">5 Miles</option>
                  <option value="10">10 Miles</option>
                  <option value="15">15 Miles</option>
                  <option value="20">20 Miles</option>
                  <option value="25">25 Miles</option>
                  <option value="50+">50+ Miles</option>
                </select>
              </label>
              <label className="admin-field-label">
                Service area description
                <textarea
                  className="admin-field admin-field--textarea"
                  rows={2}
                  value={draft.serviceAreaDescription}
                  onChange={(e) =>
                    patch("serviceAreaDescription", e.target.value)
                  }
                />
              </label>
            </div>
          </details>

          <details className="admin-review-section">
            <summary>Training locations</summary>
            <div className="admin-review-fields">
              <label className="admin-field-label">
                Gym / facility
                <input
                  className="admin-field"
                  value={draft.gymName}
                  onChange={(e) => patch("gymName", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Facility address (internal)
                <input
                  className="admin-field"
                  value={draft.facilityAddress}
                  onChange={(e) => patch("facilityAddress", e.target.value)}
                />
              </label>
            </div>
          </details>

          <details className="admin-review-section" open>
            <summary>Professional profile</summary>
            <div className="admin-review-fields">
              <label className="admin-field-label">
                Category
                <input
                  className="admin-field"
                  value={draft.professionalType}
                  onChange={(e) => patch("professionalType", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Specialties (comma-separated)
                <input
                  className="admin-field"
                  value={draft.specialties.join(", ")}
                  onChange={(e) =>
                    patch(
                      "specialties",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                />
              </label>
              <label className="admin-field-label">
                Years of experience
                <input
                  className="admin-field"
                  value={draft.yearsExperience}
                  onChange={(e) => patch("yearsExperience", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Headline
                <input
                  className="admin-field"
                  value={draft.headline}
                  onChange={(e) => patch("headline", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Certifications
                <input
                  className="admin-field"
                  value={draft.certifications
                    .map((c) => `${c.name} (${c.issuer}, ${c.year})`)
                    .join("; ")}
                  onChange={(e) => {
                    const parts = e.target.value
                      .split(";")
                      .map((p) => p.trim())
                      .filter(Boolean);
                    patch(
                      "certifications",
                      parts.map((part, i) => {
                        const match = part.match(/^(.+?)\s*\((.+),\s*(\d{4})\)/);
                        if (match) {
                          return {
                            name: match[1].trim(),
                            issuer: match[2].trim(),
                            year: Number.parseInt(match[3], 10) || 2024,
                          };
                        }
                        return {
                          name: part,
                          issuer: "—",
                          year: 2024 - i,
                        };
                      })
                    );
                  }}
                />
              </label>
            </div>
          </details>

          <details className="admin-review-section">
            <summary>Services & pricing</summary>
            <div className="admin-review-fields">
              <label className="admin-field-label">
                1:1 session price
                <input
                  className="admin-field"
                  value={draft.pricing.oneOnOnePrice}
                  onChange={(e) => patchPricing("oneOnOnePrice", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Online coaching
                <input
                  className="admin-field"
                  value={draft.pricing.onlineCoachingPrice}
                  onChange={(e) =>
                    patchPricing("onlineCoachingPrice", e.target.value)
                  }
                />
              </label>
              <label className="admin-field-label">
                Packages / services
                <textarea
                  className="admin-field admin-field--textarea"
                  rows={2}
                  value={draft.pricing.packageOptions}
                  onChange={(e) => patchPricing("packageOptions", e.target.value)}
                />
              </label>
              <p className="admin-review-readonly">
                Current summary: {servicesSummary(draft)}
              </p>
            </div>
          </details>

          <details className="admin-review-section">
            <summary>Bio & about</summary>
            <label className="admin-field-label">
              Bio
              <textarea
                className="admin-field admin-field--textarea"
                rows={5}
                value={draft.bio}
                onChange={(e) => patch("bio", e.target.value)}
              />
            </label>
          </details>

          <details className="admin-review-section">
            <summary>Online presence</summary>
            <div className="admin-review-fields">
              <label className="admin-field-label">
                Instagram
                <input
                  className="admin-field"
                  value={draft.social.instagram ?? ""}
                  onChange={(e) => patchSocial("instagram", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Website
                <input
                  className="admin-field"
                  value={draft.social.website ?? ""}
                  onChange={(e) => patchSocial("website", e.target.value)}
                />
              </label>
            </div>
          </details>
        </div>

        <footer className="admin-review-sheet__footer" data-admin-review-actions>
          {feedbackMessage ? (
            <p
              className={
                feedbackTone
                  ? `admin-review-sheet__feedback ${feedbackTone}`
                  : "admin-review-sheet__feedback"
              }
              role="status"
              aria-live="polite"
            >
              {feedbackMessage}
            </p>
          ) : null}
          {canAct ? (
            <div className="admin-review-sheet__actions">
              <button
                type="button"
                className="admin-btn admin-btn--block smoac-control"
                disabled={busyAction != null}
                onClick={handleSave}
              >
                {busyAction === "save" ? "Saving…" : "Save edits"}
              </button>
              {statusLabel === "pending" ? (
                <>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary admin-btn--block smoac-control"
                    disabled={busyAction != null}
                    onClick={handleApprove}
                  >
                    {busyAction === "approve" ? "Approving…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--danger admin-btn--block smoac-control"
                    disabled={busyAction != null}
                    onClick={handleReject}
                  >
                    {busyAction === "reject" ? "Rejecting…" : "Reject"}
                  </button>
                </>
              ) : null}
              {statusLabel === "approved" ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--block smoac-control"
                  disabled={busyAction != null}
                  onClick={handleActivate}
                >
                  {busyAction === "activate"
                    ? "Activating…"
                    : "Convert to active specialist"}
                </button>
              ) : null}
              {statusLabel === "rejected" || statusLabel === "approved" ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--block smoac-control"
                  disabled={busyAction != null}
                  onClick={handleArchive}
                >
                  {busyAction === "archive" ? "Archiving…" : "Archive"}
                </button>
              ) : null}
            </div>
          ) : (
            <p className="admin-review-sheet__feedback admin-review-sheet__feedback--muted">
              View-only — approval actions require admin permissions.
            </p>
          )}
        </footer>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return sheet;
  }

  return createPortal(sheet, document.body);
}

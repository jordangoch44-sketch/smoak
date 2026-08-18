"use client";

import { useEffect, useMemo, useState } from "react";
import { useSyncedState } from "@/hooks/useSyncedState";
import { createPortal } from "react-dom";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import {
  applicationStatusLabel,
  type AdminApplicationMutationResult,
} from "@/lib/admin-applications-service";
import {
  getSpecialistGoLiveGaps,
  isSpecialistReadyToGoLive,
} from "@/lib/specialist-go-live-gate";
import type { AdminPermissions } from "@/types/admin-permissions";
import type { SpecialistApplication } from "@/types/specialist-application";
import { GENDER_OPTIONS } from "@/constants/specialist-onboarding-options";
import { parseGender } from "@/lib/gender";

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
    app.pricing?.oneOnOnePrice,
    app.pricing?.onlineCoachingPrice,
    app.pricing?.packageOptions,
  ].filter(Boolean);
  return parts.join(" · ") || "—";
}

type SpecialistAppAction = (
  app: SpecialistApplication
) =>
  | AdminApplicationMutationResult
  | Promise<AdminApplicationMutationResult>;

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
  const goLiveGaps = useMemo(() => getSpecialistGoLiveGaps(draft), [draft]);
  const readyToGoLive = goLiveGaps.length === 0;

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
    setErrorMessage(null);
  }

  function patchPricing(
    key: keyof SpecialistApplication["pricing"],
    value: string | boolean
  ) {
    setDraft((prev) => {
      const pricing = prev.pricing ?? {
        oneOnOnePrice: "",
        onlineCoachingPrice: "",
        groupTrainingAvailable: false,
        freeConsultationAvailable: false,
        packageOptions: "",
        sessionDuration: "",
        subscriptionOptions: "",
        introOffer: "",
      };
      return {
        ...prev,
        pricing: { ...pricing, [key]: value },
      };
    });
    setFeedback(null);
    setErrorMessage(null);
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
    setErrorMessage(null);
  }

  function applyResult(
    result: SpecialistApplication,
    nextFeedback: ReviewFeedback
  ) {
    setDraft(result);
    setFeedback(nextFeedback);
    setErrorMessage(null);
  }

  async function handleSave() {
    setBusyAction("save");
    setErrorMessage(null);
    try {
      const result = await onSave(draft);
      if (result.ok) {
        applyResult(result.application, "saved");
      } else {
        setFeedback("error");
        setErrorMessage(result.message || "Unable to save application.");
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleApprove() {
    if (!isSpecialistReadyToGoLive(draft)) {
      setFeedback("error");
      setErrorMessage(
        `Cannot approve yet — add: ${goLiveGaps.map((g) => g.label).join(", ")}.`
      );
      return;
    }
    setBusyAction("approve");
    setErrorMessage(null);
    try {
      const result = await onApprove(draft);
      if (result.ok) {
        applyResult(result.application, "approved");
        /* Let the confirmation register, then close so the list + specialist
         * count visibly update behind the sheet. */
        window.setTimeout(() => onClose(), 1600);
      } else {
        setFeedback("error");
        setErrorMessage(result.message || "Unable to approve application.");
      }
    } catch (err) {
      console.error("[SMOAC ADMIN] Approve failed:", err);
      setFeedback("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to approve application."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReject() {
    setBusyAction("reject");
    setErrorMessage(null);
    try {
      const result = await onReject(draft);
      if (result.ok) {
        setDraft(result.application);
        setFeedback("rejected");
        window.setTimeout(() => onClose(), 400);
      } else {
        setFeedback("error");
        setErrorMessage(result.message || "Unable to reject application.");
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleActivate() {
    if (!isSpecialistReadyToGoLive(draft)) {
      setFeedback("error");
      setErrorMessage(
        `Cannot activate yet — add: ${goLiveGaps.map((g) => g.label).join(", ")}.`
      );
      return;
    }
    setBusyAction("activate");
    setErrorMessage(null);
    try {
      const result = await onActivate(draft);
      if (result.ok) {
        setDraft(result.application);
        setFeedback("activated");
        window.setTimeout(() => onClose(), 500);
      } else {
        setFeedback("error");
        setErrorMessage(result.message || "Unable to activate specialist.");
      }
    } catch (err) {
      console.error("[SMOAC ADMIN] Activate failed:", err);
      setFeedback("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to activate specialist."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleArchive() {
    setBusyAction("archive");
    setErrorMessage(null);
    try {
      const result = await onArchive(draft);
      if (result.ok) {
        setDraft(result.application);
        setFeedback("archived");
        window.setTimeout(() => onClose(), 400);
      } else {
        setFeedback("error");
        setErrorMessage(result.message || "Unable to archive application.");
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
          ? "Application rejected — account and email fully removed."
          : feedback === "activated"
            ? "Specialist is active on the public catalog."
            : feedback === "archived"
              ? "Application archived — account and email fully removed."
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
                Gender
                <select
                  className="admin-field"
                  value={draft.gender}
                  onChange={(e) => patch("gender", parseGender(e.target.value))}
                >
                  <option value="">Select</option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
                Profile photo URL
                <input
                  className="admin-field"
                  value={draft.media.profilePhotoUrl}
                  onChange={(e) => {
                    setErrorMessage(null);
                    setFeedback(null);
                    setDraft((prev) => ({
                      ...prev,
                      media: {
                        ...prev.media,
                        profilePhotoUrl: e.target.value,
                      },
                    }));
                  }}
                  placeholder="https://…"
                />
              </label>
              {draft.media.profilePhotoUrl.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin review preview of remote/storage URLs
                <img
                  src={draft.media.profilePhotoUrl.trim()}
                  alt=""
                  className="admin-review-photo-preview"
                />
              ) : null}
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
                  value={draft.pricing?.oneOnOnePrice ?? ""}
                  onChange={(e) => patchPricing("oneOnOnePrice", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Online coaching
                <input
                  className="admin-field"
                  value={draft.pricing?.onlineCoachingPrice ?? ""}
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
                  value={draft.pricing?.packageOptions ?? ""}
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
              <label className="admin-field-label">
                Google reviews link
                <input
                  className="admin-field"
                  value={draft.social.googleReviewsUrl ?? ""}
                  onChange={(e) =>
                    patchSocial("googleReviewsUrl", e.target.value)
                  }
                  placeholder="https://maps.google.com/…"
                />
              </label>
              <label className="admin-field-label">
                Google Place ID
                <input
                  className="admin-field"
                  value={draft.social.googlePlaceId ?? ""}
                  onChange={(e) => patchSocial("googlePlaceId", e.target.value)}
                  placeholder="ChIJ…"
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
              {(statusLabel === "pending" || statusLabel === "approved") &&
              !readyToGoLive ? (
                <div
                  className="admin-review-sheet__feedback admin-review-sheet__feedback--error"
                  role="status"
                >
                  <p className="admin-review-golive__title">
                    Go-live checklist — fill these before approve/activate:
                  </p>
                  <ul className="admin-review-golive__list">
                    {goLiveGaps.map((gap) => (
                      <li key={gap.id}>{gap.label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {statusLabel === "pending" || statusLabel === "rejected" ? (
                <label className="admin-field-label admin-review-reject-reason">
                  Rejection reason (required — closes account)
                  <textarea
                    className="admin-field admin-field--textarea"
                    rows={3}
                    value={draft.rejectionReason ?? ""}
                    onChange={(e) => {
                      setErrorMessage(null);
                      setFeedback(null);
                      setDraft((prev) => ({
                        ...prev,
                        rejectionReason: e.target.value,
                      }));
                    }}
                    placeholder="Short note explaining why this application is closed…"
                  />
                </label>
              ) : null}
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
                    disabled={busyAction != null || !readyToGoLive}
                    onClick={handleApprove}
                  >
                    {busyAction === "approve" ? "Approving…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--danger admin-btn--block smoac-control"
                    disabled={
                      busyAction != null ||
                      (draft.rejectionReason?.trim().length ?? 0) < 8
                    }
                    onClick={handleReject}
                  >
                    {busyAction === "reject" ? "Closing…" : "Reject & remove"}
                  </button>
                </>
              ) : null}
              {statusLabel === "approved" ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--block smoac-control"
                  disabled={busyAction != null || !readyToGoLive}
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
                  {busyAction === "archive" ? "Removing…" : "Archive & remove"}
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

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
import {
  parseTravelToClients,
  TRAVEL_TO_CLIENTS_OPTIONS,
} from "@/types/specialist-service-area";
import { formatTrainingOptionsLabel } from "@/types/specialist-training-options";
import { SpecialistTrainingOptionsFields } from "@/components/auth/specialist/SpecialistTrainingOptionsFields";
import {
  ADMIN_REJECTION_PRESETS,
  findRejectionPresetByReason,
  type AdminRejectionPreset,
  type AdminRejectionPresetId,
} from "@/lib/admin-application-rejection-presets";

type ReviewFeedback =
  | "saved"
  | "approved"
  | "rejected"
  | "activated"
  | "archived"
  | "error"
  | null;

type ReviewTab = "summary" | "edit";

function formatSubmittedDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSubmittedDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  if (!name.trim()) return "SP";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatCurrency(val?: string | number): string {
  if (val === undefined || val === null || val === "") return "—";
  const str = String(val).trim();
  if (str.startsWith("$")) return str;
  if (!Number.isNaN(Number(str))) return `$${str}`;
  return str;
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
  const [activeTab, setActiveTab] = useState<ReviewTab>("summary");
  const [feedback, setFeedback] = useState<ReviewFeedback>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "save" | "approve" | "reject" | "activate" | "archive" | null
  >(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedRejectPresetId, setSelectedRejectPresetId] =
    useState<AdminRejectionPresetId | null>(null);
  const [imgError, setImgError] = useState(false);

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
    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    const matched = findRejectionPresetByReason(draft.rejectionReason ?? "");
    const trimmed = (draft.rejectionReason ?? "").trim();
    setSelectedRejectPresetId(matched?.id ?? (trimmed ? "other" : null));
  }, [application.id, draft.rejectionReason]);

  function selectRejectPreset(preset: AdminRejectionPreset) {
    setSelectedRejectPresetId(preset.id);
    setErrorMessage(null);
    setFeedback(null);
    setDraft((prev) => ({
      ...prev,
      rejectionReason: preset.id === "other" ? "" : preset.reason,
    }));
  }

  function handleRejectionReasonChange(value: string) {
    setErrorMessage(null);
    setFeedback(null);
    setDraft((prev) => ({ ...prev, rejectionReason: value }));
    const matched = findRejectionPresetByReason(value);
    setSelectedRejectPresetId(
      matched?.id ?? (value.trim() ? "other" : null)
    );
  }

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
        `Cannot approve yet — missing: ${goLiveGaps.map((g) => g.label).join(", ")}.`
      );
      return;
    }
    setBusyAction("approve");
    setErrorMessage(null);
    try {
      const result = await onApprove(draft);
      if (result.ok) {
        applyResult(result.application, "approved");
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
    const reason = draft.rejectionReason?.trim() ?? "";
    if (reason.length < 8) {
      setFeedback("error");
      setErrorMessage("Please select or enter a rejection reason (min 8 chars).");
      return;
    }

    setBusyAction("reject");
    setErrorMessage(null);
    try {
      const result = await onReject(draft);
      if (result.ok) {
        setDraft(result.application);
        setFeedback("rejected");
        window.setTimeout(() => onClose(), 600);
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
        `Cannot activate yet — missing: ${goLiveGaps.map((g) => g.label).join(", ")}.`
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
        window.setTimeout(() => onClose(), 600);
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
      ? "✓ Application edits saved successfully."
      : feedback === "approved"
        ? `✓ Approved — ${draft.displayName || draft.fullName} is now a live specialist!`
        : feedback === "rejected"
          ? "Application rejected and removed."
          : feedback === "activated"
            ? "Specialist activated on public marketplace."
            : feedback === "archived"
              ? "Application archived and removed."
              : feedback === "error"
                ? errorMessage ?? "Something went wrong. Try again."
                : null;

  const feedbackTone =
    feedback === "approved" || feedback === "activated" || feedback === "saved"
      ? "admin-review-sheet__feedback--success"
      : feedback === "error"
        ? "admin-review-sheet__feedback--error"
        : null;

  const hasPhoto = Boolean(draft.media?.profilePhotoUrl?.trim()) && !imgError;
  const rawPhotoUrl = draft.media?.profilePhotoUrl?.trim();
  const displayName = draft.displayName || draft.fullName || "Unnamed Specialist";
  const profession = draft.professionalType || "Specialist";
  const isFounding = Boolean(draft.foundingInvite || draft.foundingInviteCode);

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
        aria-label="Close review panel"
        onClick={onClose}
      />
      <div className="admin-review-sheet__panel">
        {/* Header */}
        <header className="admin-review-sheet__header">
          <div className="admin-review-sheet__header-main">
            <p className="admin-review-sheet__eyebrow">
              Specialist Application Review
            </p>
            <h2 className="admin-review-sheet__title" id="admin-review-sheet-title">
              {displayName}
            </h2>
            <div className="admin-review-sheet__meta-row">
              <span className="admin-review-sheet__sub">
                Submitted {formatSubmittedDate(draft.submittedAt)}
              </span>
              <span className="admin-review-sheet__bullet" aria-hidden="true">
                •
              </span>
              <AdminStatusBadge label={statusLabel} />
              {isFounding && (
                <span className="admin-review-badge admin-review-badge--gold">
                  Founding 50
                </span>
              )}
            </div>
          </div>

          <div className="admin-review-sheet__header-actions">
            <button
              type="button"
              className="admin-review-close-btn smoac-control"
              aria-label="Close review"
              onClick={onClose}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {/* View / Edit Mode Switcher */}
        <div className="admin-review-tab-bar">
          <button
            type="button"
            className={`admin-review-tab ${activeTab === "summary" ? "admin-review-tab--active" : ""}`}
            onClick={() => setActiveTab("summary")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Review Summary
          </button>
          <button
            type="button"
            className={`admin-review-tab ${activeTab === "edit" ? "admin-review-tab--active" : ""}`}
            onClick={() => setActiveTab("edit")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit Fields
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="admin-review-sheet__body">
          {/* Go-Live Requirements Alert Card */}
          {(statusLabel === "pending" || statusLabel === "approved") &&
          !readyToGoLive ? (
            <div
              className="admin-review-golive-card"
              role="region"
              aria-label="Go-live requirements"
            >
              <div className="admin-review-golive-card__header">
                <span className="admin-review-golive-card__icon" aria-hidden="true">
                  ⚠️
                </span>
                <div>
                  <h4 className="admin-review-golive-card__title">
                    Go-Live Checklist Required Before Approval
                  </h4>
                  <p className="admin-review-golive-card__subtitle">
                    {goLiveGaps.length} requirement
                    {goLiveGaps.length === 1 ? "" : "s"} remaining to publish to the marketplace
                  </p>
                </div>
              </div>
              <div className="admin-review-golive-card__chips">
                {goLiveGaps.map((gap) => (
                  <span key={gap.id} className="admin-review-golive-chip">
                    <span className="admin-review-golive-chip__dot" />
                    {gap.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* TAB 1: SUMMARY REVIEW (Rich, luxury layout) */}
          {activeTab === "summary" ? (
            <div className="admin-review-summary-view">
              {/* Profile Hero Card */}
              <div className="admin-review-card admin-review-hero-card">
                <div className="admin-review-hero-card__main">
                  <div className="admin-review-hero-avatar-wrapper">
                    {hasPhoto && rawPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rawPhotoUrl}
                        alt={displayName}
                        className="admin-review-hero-avatar"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="admin-review-hero-avatar-fallback">
                        {getInitials(displayName)}
                      </div>
                    )}
                  </div>
                  <div className="admin-review-hero-card__details">
                    <div className="admin-review-hero-card__names">
                      <h3 className="admin-review-hero-name">{displayName}</h3>
                      {draft.fullName && draft.fullName !== draft.displayName && (
                        <p className="admin-review-hero-legal">
                          Legal: {draft.fullName}
                        </p>
                      )}
                      {draft.businessName && (
                        <p className="admin-review-hero-business">
                          🏢 {draft.businessName}
                        </p>
                      )}
                    </div>
                    <p className="admin-review-hero-headline">
                      {draft.headline || "No headline provided"}
                    </p>
                    <div className="admin-review-pill-row">
                      <span className="admin-review-pill admin-review-pill--highlight">
                        {profession}
                      </span>
                      {draft.yearsExperience && (
                        <span className="admin-review-pill">
                          {draft.yearsExperience} yrs exp
                        </span>
                      )}
                      {draft.gender && (
                        <span className="admin-review-pill">
                          {draft.gender}
                        </span>
                      )}
                      {draft.cprCertified && (
                        <span className="admin-review-pill admin-review-pill--green">
                          ✓ CPR Certified
                        </span>
                      )}
                      {draft.insuranceVerified && (
                        <span className="admin-review-pill admin-review-pill--green">
                          ✓ Insured
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact & Identity Section */}
              <div className="admin-review-card">
                <div className="admin-review-card__header">
                  <h4 className="admin-review-card__title">
                    <span className="admin-review-card__icon">👤</span>
                    Contact & Identity
                  </h4>
                  <button
                    type="button"
                    className="admin-review-card__edit-btn"
                    onClick={() => setActiveTab("edit")}
                  >
                    Edit
                  </button>
                </div>
                <div className="admin-review-kv-grid">
                  <div className="admin-review-kv">
                    <span className="admin-review-kv__label">Email</span>
                    <a
                      href={`mailto:${draft.email}`}
                      className="admin-review-kv__value admin-review-kv__link"
                    >
                      {draft.email || "—"}
                    </a>
                  </div>
                  <div className="admin-review-kv">
                    <span className="admin-review-kv__label">Phone</span>
                    {draft.phone ? (
                      <a
                        href={`tel:${draft.phone}`}
                        className="admin-review-kv__value admin-review-kv__link"
                      >
                        {draft.phone}
                      </a>
                    ) : (
                      <span className="admin-review-kv__value">—</span>
                    )}
                  </div>
                  <div className="admin-review-kv">
                    <span className="admin-review-kv__label">Gender</span>
                    <span className="admin-review-kv__value">
                      {draft.gender ? String(draft.gender).toUpperCase() : "—"}
                    </span>
                  </div>
                  <div className="admin-review-kv">
                    <span className="admin-review-kv__label">Submitted At</span>
                    <span className="admin-review-kv__value">
                      {formatSubmittedDateTime(draft.submittedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location & Service Area */}
              <div className="admin-review-card">
                <div className="admin-review-card__header">
                  <h4 className="admin-review-card__title">
                    <span className="admin-review-card__icon">📍</span>
                    Location & Service Area
                  </h4>
                  <button
                    type="button"
                    className="admin-review-card__edit-btn"
                    onClick={() => setActiveTab("edit")}
                  >
                    Edit
                  </button>
                </div>
                <div className="admin-review-kv-grid">
                  <div className="admin-review-kv">
                    <span className="admin-review-kv__label">Primary Location</span>
                    <span className="admin-review-kv__value admin-review-kv__value--highlight">
                      {[draft.city, draft.state].filter(Boolean).join(", ") || "—"} {draft.zipCode ? `(${draft.zipCode})` : ""}
                    </span>
                  </div>
                  <div className="admin-review-kv">
                    <span className="admin-review-kv__label">Neighborhood</span>
                    <span className="admin-review-kv__value">
                      {draft.neighborhood || "—"}
                    </span>
                  </div>
                  <div className="admin-review-kv">
                    <span className="admin-review-kv__label">Service Format</span>
                    <span className="admin-review-kv__value">
                      {draft.serviceType ? draft.serviceType.toUpperCase() : "In-Person"}
                    </span>
                  </div>
                  <div className="admin-review-kv">
                    <span className="admin-review-kv__label">Travel Preference</span>
                    <span className="admin-review-kv__value">
                      {draft.travelToClients ? String(draft.travelToClients) : draft.willingToTravel ? "Willing to travel" : "Client travels to specialist"}
                      {draft.travelRadius ? ` (up to ${draft.travelRadius} miles)` : ""}
                    </span>
                  </div>
                  {draft.gymName && (
                    <div className="admin-review-kv admin-review-kv--full">
                      <span className="admin-review-kv__label">Facility / Gym</span>
                      <span className="admin-review-kv__value">
                        {draft.gymName}
                        {draft.facilityAddress ? ` · ${draft.facilityAddress}` : ""}
                      </span>
                    </div>
                  )}
                  {draft.serviceAreaDescription && (
                    <div className="admin-review-kv admin-review-kv--full">
                      <span className="admin-review-kv__label">Service Area Notes</span>
                      <span className="admin-review-kv__value admin-review-kv__value--text">
                        {draft.serviceAreaDescription}
                      </span>
                    </div>
                  )}
                  {Array.isArray(draft.serviceAreaZipCodes) && draft.serviceAreaZipCodes.length > 0 && (
                    <div className="admin-review-kv admin-review-kv--full">
                      <span className="admin-review-kv__label">Covered ZIP Codes</span>
                      <div className="admin-review-tag-cloud">
                        {draft.serviceAreaZipCodes.map((zip) => (
                          <span key={zip} className="admin-review-tag admin-review-tag--sm">
                            {zip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing & Services */}
              <div className="admin-review-card">
                <div className="admin-review-card__header">
                  <h4 className="admin-review-card__title">
                    <span className="admin-review-card__icon">💳</span>
                    Pricing & Packages
                  </h4>
                  <button
                    type="button"
                    className="admin-review-card__edit-btn"
                    onClick={() => setActiveTab("edit")}
                  >
                    Edit
                  </button>
                </div>
                <div className="admin-review-pricing-stats">
                  <div className="admin-review-stat-box">
                    <span className="admin-review-stat-box__label">1:1 Session Rate</span>
                    <span className="admin-review-stat-box__num">
                      {formatCurrency(draft.pricing?.oneOnOnePrice)}
                    </span>
                    {draft.pricing?.sessionDuration && (
                      <span className="admin-review-stat-box__sub">
                        {draft.pricing.sessionDuration}
                      </span>
                    )}
                  </div>
                  <div className="admin-review-stat-box">
                    <span className="admin-review-stat-box__label">Online Coaching</span>
                    <span className="admin-review-stat-box__num">
                      {formatCurrency(draft.pricing?.onlineCoachingPrice)}
                    </span>
                    <span className="admin-review-stat-box__sub">Monthly / Remote</span>
                  </div>
                </div>

                <div className="admin-review-kv-grid" style={{ marginTop: "0.85rem" }}>
                  <div className="admin-review-kv">
                    <span className="admin-review-kv__label">Free Consultation</span>
                    <span className="admin-review-kv__value">
                      {draft.pricing?.freeConsultationAvailable ? "✓ Yes" : "No"}
                    </span>
                  </div>
                  <div className="admin-review-kv">
                    <span className="admin-review-kv__label">Training options</span>
                    <span className="admin-review-kv__value">
                      {formatTrainingOptionsLabel(draft.trainingOptions) ||
                        "One-on-one"}
                    </span>
                  </div>
                  {draft.pricing?.introOffer && (
                    <div className="admin-review-kv admin-review-kv--full">
                      <span className="admin-review-kv__label">Introductory Offer</span>
                      <span className="admin-review-kv__value admin-review-kv__value--highlight">
                        {draft.pricing.introOffer}
                      </span>
                    </div>
                  )}
                  {draft.pricing?.packageOptions && (
                    <div className="admin-review-kv admin-review-kv--full">
                      <span className="admin-review-kv__label">Package & Session Offerings</span>
                      <p className="admin-review-kv__value admin-review-kv__value--text">
                        {draft.pricing.packageOptions}
                      </p>
                    </div>
                  )}
                  {draft.pricing?.subscriptionOptions && (
                    <div className="admin-review-kv admin-review-kv--full">
                      <span className="admin-review-kv__label">Subscriptions / Retainers</span>
                      <p className="admin-review-kv__value admin-review-kv__value--text">
                        {draft.pricing.subscriptionOptions}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Specialties & Qualifications */}
              <div className="admin-review-card">
                <div className="admin-review-card__header">
                  <h4 className="admin-review-card__title">
                    <span className="admin-review-card__icon">🏆</span>
                    Specialties & Qualifications
                  </h4>
                  <button
                    type="button"
                    className="admin-review-card__edit-btn"
                    onClick={() => setActiveTab("edit")}
                  >
                    Edit
                  </button>
                </div>
                <div className="admin-review-stack">
                  <div>
                    <span className="admin-review-kv__label">Specialties</span>
                    {Array.isArray(draft.specialties) && draft.specialties.length > 0 ? (
                      <div className="admin-review-tag-cloud" style={{ marginTop: "0.4rem" }}>
                        {draft.specialties.map((spec) => (
                          <span key={spec} className="admin-review-tag admin-review-tag--lavender">
                            {spec}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="admin-review-muted-text">None specified</p>
                    )}
                  </div>

                  {Array.isArray(draft.certifications) && draft.certifications.length > 0 && (
                    <div>
                      <span className="admin-review-kv__label">Certifications & Credentials</span>
                      <div className="admin-review-cert-list">
                        {draft.certifications
                          .filter((c) => c.name?.trim())
                          .map((cert, i) => (
                            <div key={i} className="admin-review-cert-item">
                              <span className="admin-review-cert-icon">📜</span>
                              <div className="admin-review-cert-info">
                                <p className="admin-review-cert-name">{cert.name}</p>
                                <p className="admin-review-cert-issuer">
                                  {cert.issuer || "Accredited"} {cert.year ? `· ${cert.year}` : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {(draft.collegeAttended || draft.degree) && (
                    <div className="admin-review-kv admin-review-kv--full">
                      <span className="admin-review-kv__label">Education / Degree</span>
                      <span className="admin-review-kv__value">
                        {[draft.degree, draft.collegeAttended].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  )}

                  {Array.isArray(draft.ageRangesWorkedWith) && draft.ageRangesWorkedWith.length > 0 && (
                    <div className="admin-review-kv admin-review-kv--full">
                      <span className="admin-review-kv__label">Client Age Demographics</span>
                      <div className="admin-review-tag-cloud" style={{ marginTop: "0.25rem" }}>
                        {draft.ageRangesWorkedWith.map((age) => (
                          <span key={age} className="admin-review-tag admin-review-tag--sm">
                            {age}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio & Coaching Story */}
              <div className="admin-review-card">
                <div className="admin-review-card__header">
                  <h4 className="admin-review-card__title">
                    <span className="admin-review-card__icon">📖</span>
                    Bio & Coaching Story
                  </h4>
                  <button
                    type="button"
                    className="admin-review-card__edit-btn"
                    onClick={() => setActiveTab("edit")}
                  >
                    Edit
                  </button>
                </div>
                <div className="admin-review-stack">
                  <div>
                    <span className="admin-review-kv__label">Specialist Bio</span>
                    <div className="admin-review-text-box">
                      {draft.bio || "No bio entered yet."}
                    </div>
                  </div>
                  {draft.coachingPhilosophy && (
                    <div>
                      <span className="admin-review-kv__label">Coaching Philosophy</span>
                      <div className="admin-review-text-box admin-review-text-box--secondary">
                        {draft.coachingPhilosophy}
                      </div>
                    </div>
                  )}
                  {draft.coachingDifferentiator && (
                    <div>
                      <span className="admin-review-kv__label">What Sets Them Apart</span>
                      <div className="admin-review-text-box admin-review-text-box--secondary">
                        {draft.coachingDifferentiator}
                      </div>
                    </div>
                  )}
                  {draft.bestClientTypes && (
                    <div>
                      <span className="admin-review-kv__label">Best Client Types</span>
                      <div className="admin-review-text-box admin-review-text-box--secondary">
                        {draft.bestClientTypes}
                      </div>
                    </div>
                  )}
                  {(draft.communicationStyle || draft.motivationStyle) && (
                    <div className="admin-review-kv-grid">
                      {draft.communicationStyle && (
                        <div className="admin-review-kv">
                          <span className="admin-review-kv__label">Communication Style</span>
                          <span className="admin-review-kv__value">{draft.communicationStyle}</span>
                        </div>
                      )}
                      {draft.motivationStyle && (
                        <div className="admin-review-kv">
                          <span className="admin-review-kv__label">Motivation Style</span>
                          <span className="admin-review-kv__value">{draft.motivationStyle}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Availability & Capacity */}
              {(draft.availability?.daysAvailable?.length ||
                draft.availability?.timeBlocks?.length ||
                draft.availability?.clientCapacity) ? (
                <div className="admin-review-card">
                  <div className="admin-review-card__header">
                    <h4 className="admin-review-card__title">
                      <span className="admin-review-card__icon">📅</span>
                      Availability & Capacity
                    </h4>
                  </div>
                  <div className="admin-review-kv-grid">
                    {draft.availability?.daysAvailable && draft.availability.daysAvailable.length > 0 && (
                      <div className="admin-review-kv admin-review-kv--full">
                        <span className="admin-review-kv__label">Days Available</span>
                        <div className="admin-review-tag-cloud" style={{ marginTop: "0.25rem" }}>
                          {draft.availability.daysAvailable.map((d) => (
                            <span key={d} className="admin-review-tag admin-review-tag--gold">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {draft.availability?.timeBlocks && draft.availability.timeBlocks.length > 0 && (
                      <div className="admin-review-kv admin-review-kv--full">
                        <span className="admin-review-kv__label">Time Blocks</span>
                        <div className="admin-review-tag-cloud" style={{ marginTop: "0.25rem" }}>
                          {draft.availability.timeBlocks.map((t) => (
                            <span key={t} className="admin-review-tag">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {draft.availability?.clientCapacity && (
                      <div className="admin-review-kv">
                        <span className="admin-review-kv__label">Client Capacity</span>
                        <span className="admin-review-kv__value">
                          {draft.availability.clientCapacity} clients
                        </span>
                      </div>
                    )}
                    <div className="admin-review-kv">
                      <span className="admin-review-kv__label">Accepting New Clients</span>
                      <span className="admin-review-kv__value">
                        {draft.availability?.acceptingNewClients ? "✓ Yes" : "No (Waitlist)"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Social & Web Presence */}
              <div className="admin-review-card">
                <div className="admin-review-card__header">
                  <h4 className="admin-review-card__title">
                    <span className="admin-review-card__icon">🌐</span>
                    Social & Online Presence
                  </h4>
                  <button
                    type="button"
                    className="admin-review-card__edit-btn"
                    onClick={() => setActiveTab("edit")}
                  >
                    Edit
                  </button>
                </div>
                <div className="admin-review-kv-grid">
                  <div className="admin-review-kv">
                    <span className="admin-review-kv__label">Instagram</span>
                    {draft.social?.instagram ? (
                      <a
                        href={
                          draft.social.instagram.startsWith("http")
                            ? draft.social.instagram
                            : `https://instagram.com/${draft.social.instagram.replace(/^@/, "")}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="admin-review-kv__value admin-review-kv__link"
                      >
                        {draft.social.instagram} ↗
                      </a>
                    ) : (
                      <span className="admin-review-kv__value">—</span>
                    )}
                  </div>
                  <div className="admin-review-kv">
                    <span className="admin-review-kv__label">Website</span>
                    {draft.social?.website ? (
                      <a
                        href={
                          draft.social.website.startsWith("http")
                            ? draft.social.website
                            : `https://${draft.social.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="admin-review-kv__value admin-review-kv__link"
                      >
                        {draft.social.website} ↗
                      </a>
                    ) : (
                      <span className="admin-review-kv__value">—</span>
                    )}
                  </div>
                  {draft.social?.tiktok && (
                    <div className="admin-review-kv">
                      <span className="admin-review-kv__label">TikTok</span>
                      <span className="admin-review-kv__value">{draft.social.tiktok}</span>
                    </div>
                  )}
                  {draft.social?.googleReviewsUrl && (
                    <div className="admin-review-kv admin-review-kv--full">
                      <span className="admin-review-kv__label">Google Reviews Link</span>
                      <a
                        href={draft.social.googleReviewsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-review-kv__value admin-review-kv__link"
                      >
                        {draft.social.googleReviewsUrl} ↗
                      </a>
                    </div>
                  )}
                  {draft.social?.googlePlaceId && (
                    <div className="admin-review-kv admin-review-kv--full">
                      <span className="admin-review-kv__label">Google Place ID</span>
                      <span className="admin-review-kv__value admin-review-code">
                        {draft.social.googlePlaceId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: EDIT FIELDS (Full granular form editing) */
            <div className="admin-review-edit-view">
              <details className="admin-review-section" open>
                <summary>Contact & Identity</summary>
                <div className="admin-review-fields">
                  <div className="admin-review-grid admin-review-grid--2col">
                    <label className="admin-field-label">
                      Full Legal Name
                      <input
                        className="admin-field"
                        value={draft.fullName}
                        onChange={(e) => patch("fullName", e.target.value)}
                      />
                    </label>
                    <label className="admin-field-label">
                      Display / Public Name
                      <input
                        className="admin-field"
                        value={draft.displayName}
                        onChange={(e) => patch("displayName", e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="admin-review-grid admin-review-grid--2col">
                    <label className="admin-field-label">
                      Business Name
                      <input
                        className="admin-field"
                        value={draft.businessName}
                        onChange={(e) => patch("businessName", e.target.value)}
                        placeholder="e.g. Apex Performance"
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
                  </div>
                  <div className="admin-review-grid admin-review-grid--2col">
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
                  <label className="admin-field-label">
                    Profile Photo URL
                    <input
                      className="admin-field"
                      value={draft.media?.profilePhotoUrl ?? ""}
                      onChange={(e) => {
                        setErrorMessage(null);
                        setFeedback(null);
                        setImgError(false);
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
                </div>
              </details>

              <details className="admin-review-section" open>
                <summary>Service Area & Location</summary>
                <div className="admin-review-fields">
                  <div className="admin-review-grid admin-review-grid--3col">
                    <label className="admin-field-label">
                      ZIP Code
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
                  </div>
                  <label className="admin-field-label">
                    Neighborhood
                    <input
                      className="admin-field"
                      value={draft.neighborhood}
                      onChange={(e) => patch("neighborhood", e.target.value)}
                    />
                  </label>
                  <div className="admin-review-grid admin-review-grid--2col">
                    <label className="admin-field-label">
                      Service Type
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
                      Willing to Travel
                      <select
                        className="admin-field"
                        value={draft.travelToClients}
                        onChange={(e) =>
                          patch("travelToClients", parseTravelToClients(e.target.value))
                        }
                      >
                        <option value="">—</option>
                        {TRAVEL_TO_CLIENTS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="admin-field-label">
                    Service Area Description
                    <textarea
                      className="admin-field admin-field--textarea"
                      rows={2}
                      value={draft.serviceAreaDescription}
                      onChange={(e) =>
                        patch("serviceAreaDescription", e.target.value)
                      }
                    />
                  </label>
                  <div className="admin-review-grid admin-review-grid--2col">
                    <label className="admin-field-label">
                      Gym / Studio Name
                      <input
                        className="admin-field"
                        value={draft.gymName}
                        onChange={(e) => patch("gymName", e.target.value)}
                      />
                    </label>
                    <label className="admin-field-label">
                      Facility Address (Internal Ops)
                      <input
                        className="admin-field"
                        value={draft.facilityAddress}
                        onChange={(e) => patch("facilityAddress", e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </details>

              <details className="admin-review-section" open>
                <summary>Professional Profile & Specialties</summary>
                <div className="admin-review-fields">
                  <div className="admin-review-grid admin-review-grid--2col">
                    <label className="admin-field-label">
                      Category / Profession
                      <input
                        className="admin-field"
                        value={draft.professionalType}
                        onChange={(e) => patch("professionalType", e.target.value)}
                      />
                    </label>
                    <label className="admin-field-label">
                      Years Experience
                      <input
                        className="admin-field"
                        value={draft.yearsExperience}
                        onChange={(e) => patch("yearsExperience", e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="admin-field-label">
                    Headline
                    <input
                      className="admin-field"
                      value={draft.headline}
                      onChange={(e) => patch("headline", e.target.value)}
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
                    Certifications (format: Name (Issuer, Year); ...)
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
                  <div className="admin-review-grid admin-review-grid--2col">
                    <label className="admin-field-label">
                      Degree
                      <input
                        className="admin-field"
                        value={draft.degree}
                        onChange={(e) => patch("degree", e.target.value)}
                      />
                    </label>
                    <label className="admin-field-label">
                      College / University
                      <input
                        className="admin-field"
                        value={draft.collegeAttended}
                        onChange={(e) => patch("collegeAttended", e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </details>

              <details className="admin-review-section" open>
                <summary>Services & Pricing</summary>
                <div className="admin-review-fields">
                  <div className="admin-review-grid admin-review-grid--2col">
                    <label className="admin-field-label">
                      1:1 Session Price ($)
                      <input
                        className="admin-field"
                        value={draft.pricing?.oneOnOnePrice ?? ""}
                        onChange={(e) => patchPricing("oneOnOnePrice", e.target.value)}
                      />
                    </label>
                    <label className="admin-field-label">
                      Online Coaching Price ($/mo)
                      <input
                        className="admin-field"
                        value={draft.pricing?.onlineCoachingPrice ?? ""}
                        onChange={(e) =>
                          patchPricing("onlineCoachingPrice", e.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label className="admin-field-label">
                    Intro Offer
                    <input
                      className="admin-field"
                      value={draft.pricing?.introOffer ?? ""}
                      onChange={(e) => patchPricing("introOffer", e.target.value)}
                      placeholder="e.g. First session 50% off"
                    />
                  </label>
                  <SpecialistTrainingOptionsFields
                    value={draft.trainingOptions}
                    onChange={(trainingOptions) =>
                      patch("trainingOptions", trainingOptions)
                    }
                  />
                  <label className="admin-field-label">
                    Packages & Pricing Description
                    <textarea
                      className="admin-field admin-field--textarea"
                      rows={3}
                      value={draft.pricing?.packageOptions ?? ""}
                      onChange={(e) => patchPricing("packageOptions", e.target.value)}
                    />
                  </label>
                </div>
              </details>

              <details className="admin-review-section" open>
                <summary>Bio & Story</summary>
                <div className="admin-review-fields">
                  <label className="admin-field-label">
                    Bio
                    <textarea
                      className="admin-field admin-field--textarea"
                      rows={5}
                      value={draft.bio}
                      onChange={(e) => patch("bio", e.target.value)}
                    />
                  </label>
                  <label className="admin-field-label">
                    Coaching Philosophy
                    <textarea
                      className="admin-field admin-field--textarea"
                      rows={3}
                      value={draft.coachingPhilosophy}
                      onChange={(e) => patch("coachingPhilosophy", e.target.value)}
                    />
                  </label>
                </div>
              </details>

              <details className="admin-review-section">
                <summary>Online Presence</summary>
                <div className="admin-review-fields">
                  <div className="admin-review-grid admin-review-grid--2col">
                    <label className="admin-field-label">
                      Instagram
                      <input
                        className="admin-field"
                        value={draft.social?.instagram ?? ""}
                        onChange={(e) => patchSocial("instagram", e.target.value)}
                      />
                    </label>
                    <label className="admin-field-label">
                      Website
                      <input
                        className="admin-field"
                        value={draft.social?.website ?? ""}
                        onChange={(e) => patchSocial("website", e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="admin-field-label">
                    Google Reviews Link
                    <input
                      className="admin-field"
                      value={draft.social?.googleReviewsUrl ?? ""}
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
                      value={draft.social?.googlePlaceId ?? ""}
                      onChange={(e) => patchSocial("googlePlaceId", e.target.value)}
                      placeholder="ChIJ…"
                    />
                  </label>
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Footer with Actions and On-Demand Rejection Step */}
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
              {/* REJECTION DRAWER / CONFIRMATION (ONLY SHOWN IF isRejecting === true) */}
              {isRejecting ? (
                <div className="admin-review-reject-panel" role="region" aria-label="Rejection Reason Confirmation">
                  <div className="admin-review-reject-panel__header">
                    <div>
                      <h4 className="admin-review-reject-panel__title">
                        Reject Application & Remove Specialist
                      </h4>
                      <p className="admin-review-reject-panel__desc">
                        Select a preset or write a message to explain the decision to the specialist.
                      </p>
                    </div>
                  </div>

                  <div
                    className="admin-reject-presets"
                    role="group"
                    aria-label="Rejection reason presets"
                  >
                    {ADMIN_REJECTION_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={
                          selectedRejectPresetId === preset.id
                            ? "admin-reject-preset admin-reject-preset--active smoac-control"
                            : "admin-reject-preset smoac-control"
                        }
                        aria-pressed={selectedRejectPresetId === preset.id}
                        onClick={() => selectRejectPreset(preset)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <label className="admin-field-label admin-review-reject-reason__edit">
                    Message to specialist (min 8 characters)
                    <textarea
                      className="admin-field admin-field--textarea"
                      rows={3}
                      value={draft.rejectionReason ?? ""}
                      onChange={(e) => handleRejectionReasonChange(e.target.value)}
                      placeholder={
                        selectedRejectPresetId === "other"
                          ? "Describe why this application is being closed…"
                          : "Tap a preset above, or edit this message…"
                      }
                    />
                  </label>

                  <div className="admin-review-reject-panel__btns">
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger smoac-control"
                      disabled={
                        busyAction != null ||
                        (draft.rejectionReason?.trim().length ?? 0) < 8
                      }
                      onClick={handleReject}
                    >
                      {busyAction === "reject" ? "Rejecting…" : "Confirm Rejection & Remove"}
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary smoac-control"
                      disabled={busyAction != null}
                      onClick={() => {
                        setIsRejecting(false);
                        setErrorMessage(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* DEFAULT ACTION BAR */
                <div className="admin-review-sheet__action-group">
                  {/* Primary Action Button */}
                  {statusLabel === "pending" ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn--primary admin-btn--block smoac-control admin-btn--approve-shine"
                      disabled={busyAction != null || !readyToGoLive}
                      onClick={handleApprove}
                    >
                      {busyAction === "approve"
                        ? "Approving…"
                        : readyToGoLive
                          ? "✓ Approve & Go Live"
                          : "Approve (Requirements Incomplete)"}
                    </button>
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
                        : "✓ Convert to Active Specialist"}
                    </button>
                  ) : null}

                  {/* Secondary & Danger Buttons Row */}
                  <div className="admin-review-sheet__action-subrow">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-review-btn-flex smoac-control"
                      disabled={busyAction != null}
                      onClick={handleSave}
                    >
                      {busyAction === "save" ? "Saving…" : "Save edits"}
                    </button>

                    {statusLabel === "pending" ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger-outline admin-review-btn-flex smoac-control"
                        disabled={busyAction != null}
                        onClick={() => setIsRejecting(true)}
                      >
                        Reject & remove
                      </button>
                    ) : null}

                    {statusLabel === "rejected" || statusLabel === "approved" ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger-outline admin-review-btn-flex smoac-control"
                        disabled={busyAction != null}
                        onClick={handleArchive}
                      >
                        {busyAction === "archive" ? "Removing…" : "Archive & remove"}
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
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

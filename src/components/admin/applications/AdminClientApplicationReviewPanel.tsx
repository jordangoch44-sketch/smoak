"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSyncedState } from "@/hooks/useSyncedState";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import {
  clientApplicationStatusLabel,
  type ClientApplicationMutationResult,
} from "@/lib/client-applications-service";
import type { AdminPermissions } from "@/types/admin-permissions";
import type { ClientApplication } from "@/types/client-application";

type ReviewFeedback =
  | "saved"
  | "approved"
  | "rejected"
  | "archived"
  | "error"
  | null;

type ClientAppAction = (
  app: ClientApplication
) =>
  | ClientApplicationMutationResult
  | Promise<ClientApplicationMutationResult>;

interface AdminClientApplicationReviewPanelProps {
  application: ClientApplication;
  permissions: AdminPermissions;
  onClose: () => void;
  onSave: ClientAppAction;
  onApprove: ClientAppAction;
  onReject: ClientAppAction;
  onArchive: ClientAppAction;
}

function formatSubmittedDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminClientApplicationReviewPanel({
  application,
  permissions,
  onClose,
  onSave,
  onApprove,
  onReject,
  onArchive,
}: AdminClientApplicationReviewPanelProps) {
  const [draft, setDraft] = useSyncedState(application.id, application);
  const [feedback, setFeedback] = useState<ReviewFeedback>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "save" | "approve" | "reject" | "archive" | null
  >(null);

  const statusLabel = clientApplicationStatusLabel(draft.status);
  const canAct = permissions.canApproveApplications;

  useEffect(() => {
    document.body.classList.add("admin-review-open");
    return () => document.body.classList.remove("admin-review-open");
  }, []);

  useEffect(() => {
    if (!feedback || feedback === "error") return;
    const timer = window.setTimeout(() => setFeedback(null), 2800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function patch<K extends keyof ClientApplication>(
    key: K,
    value: ClientApplication[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setFeedback(null);
    setErrorMessage(null);
  }

  async function runAction(
    action: "save" | "approve" | "reject" | "archive",
    runner: ClientAppAction
  ) {
    setBusyAction(action);
    setErrorMessage(null);
    try {
      const result = await runner(draft);
      if (result.ok) {
        setDraft(result.application);
        setFeedback(
          action === "save"
            ? "saved"
            : action === "approve"
              ? "approved"
              : action === "reject"
                ? "rejected"
                : "archived"
        );
        if (action === "approve" || action === "reject" || action === "archive") {
          window.setTimeout(() => onClose(), action === "approve" ? 1200 : 400);
        }
      } else {
        setFeedback("error");
        setErrorMessage(
          result.message ||
            (action === "save"
              ? "Unable to save client application."
              : action === "approve"
                ? "Unable to mark client active."
                : action === "reject"
                  ? "Unable to reject application."
                  : "Unable to archive application.")
        );
      }
    } catch (err) {
      console.error("[SMOAC ADMIN] Client application action failed:", err);
      setFeedback("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to update client application."
      );
    } finally {
      setBusyAction(null);
    }
  }

  const feedbackMessage =
    feedback === "saved"
      ? "Changes saved."
      : feedback === "approved"
        ? "Client marked active."
        : feedback === "rejected"
          ? "Application rejected."
          : feedback === "archived"
            ? "Application archived."
            : feedback === "error"
              ? errorMessage || "Something went wrong."
              : null;

  const sheet = (
    <div className="admin-review-sheet" role="dialog" aria-modal="true">
      <button
        type="button"
        className="admin-review-sheet__backdrop"
        aria-label="Close review"
        onClick={onClose}
      />
      <div className="admin-review-sheet__panel">
        <header className="admin-review-sheet__header">
          <div>
            <p className="admin-review-sheet__eyebrow">Client application</p>
            <h2 className="admin-review-sheet__title">{draft.fullName}</h2>
            <p className="admin-review-sheet__sub">{draft.email}</p>
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
          <p className="admin-review-readonly">
            Submitted {formatSubmittedDate(draft.submittedAt)}
          </p>
          <div className="admin-review-fields">
            <div className="admin-review-grid admin-review-grid--2col">
              <label className="admin-field-label">
                Full name
                <input
                  className="admin-field"
                  value={draft.fullName}
                  onChange={(e) => patch("fullName", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Email
                <input
                  className="admin-field"
                  value={draft.email}
                  onChange={(e) => patch("email", e.target.value)}
                />
              </label>
            </div>
            <div className="admin-review-grid admin-review-grid--2col">
              <label className="admin-field-label">
                Phone
                <input
                  className="admin-field"
                  value={draft.phone}
                  onChange={(e) => patch("phone", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Budget
                <input
                  className="admin-field"
                  value={draft.budget}
                  onChange={(e) => patch("budget", e.target.value)}
                />
              </label>
            </div>
            <div className="admin-review-grid admin-review-grid--3col">
              <label className="admin-field-label">
                Preferred city
                <input
                  className="admin-field"
                  value={draft.preferredCity}
                  onChange={(e) => patch("preferredCity", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                Neighborhood
                <input
                  className="admin-field"
                  value={draft.preferredNeighborhood}
                  onChange={(e) => patch("preferredNeighborhood", e.target.value)}
                />
              </label>
              <label className="admin-field-label">
                ZIP
                <input
                  className="admin-field"
                  value={draft.preferredZipCode}
                  onChange={(e) => patch("preferredZipCode", e.target.value)}
                />
              </label>
            </div>
            <label className="admin-field-label">
              Fitness Goals
              <textarea
                className="admin-field admin-field--textarea"
                rows={3}
                value={draft.fitnessGoals.join(", ")}
                onChange={(e) =>
                  patch(
                    "fitnessGoals",
                    e.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  )
                }
              />
            </label>
          </div>
        </div>

        <footer className="admin-review-sheet__footer" data-admin-review-actions>
          {feedbackMessage ? (
            <p
              className={
                feedback === "error"
                  ? "admin-review-sheet__feedback admin-review-sheet__feedback--error"
                  : "admin-review-sheet__feedback"
              }
              role={feedback === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {feedbackMessage}
            </p>
          ) : null}
          {canAct ? (
            <div className="admin-review-sheet__actions">
              {/* Primary Action Button */}
              {statusLabel === "pending" ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--block smoac-control"
                  disabled={busyAction != null}
                  onClick={() => void runAction("approve", onApprove)}
                >
                  {busyAction === "approve" ? "Approving…" : "Approve & Activate"}
                </button>
              ) : null}

              {/* Secondary Action: Save Edits */}
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--block smoac-control"
                disabled={busyAction != null}
                onClick={() => void runAction("save", onSave)}
              >
                {busyAction === "save" ? "Saving…" : "Save edits"}
              </button>

              {/* Destructive Action: Reject or Archive */}
              {statusLabel === "pending" ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--danger admin-btn--block smoac-control"
                  disabled={busyAction != null}
                  onClick={() => void runAction("reject", onReject)}
                >
                  {busyAction === "reject" ? "Rejecting…" : "Reject application"}
                </button>
              ) : null}

              {statusLabel === "rejected" || statusLabel === "approved" ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--danger admin-btn--block smoac-control"
                  disabled={busyAction != null}
                  onClick={() => void runAction("archive", onArchive)}
                >
                  {busyAction === "archive" ? "Archiving…" : "Archive application"}
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

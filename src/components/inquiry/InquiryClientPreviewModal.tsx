"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InquiryAvatar } from "./InquiryAvatar";
import type { InquiryClientPreview } from "@/lib/inquiry/inquiry-client-preview";

interface InquiryClientPreviewModalProps {
  open: boolean;
  preview: InquiryClientPreview | null;
  loading?: boolean;
  onClose: () => void;
}

function StatRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="inquiry-client-preview__stat">
      <p className="inquiry-client-preview__stat-label">{label}</p>
      <p className="inquiry-client-preview__stat-value">{value}</p>
    </div>
  );
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="inquiry-client-preview__stat">
      <p className="inquiry-client-preview__stat-label">{label}</p>
      <div className="inquiry-client-preview__chips">
        {items.map((item) => (
          <span key={item} className="inquiry-client-preview__chip">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function InquiryClientPreviewModal({
  open,
  preview,
  loading = false,
  onClose,
}: InquiryClientPreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const hasDetails = Boolean(
    preview &&
      (preview.location ||
        preview.goals.length > 0 ||
        preview.professions.length > 0 ||
        preview.specialties.length > 0 ||
        preview.budgetLabel ||
        preview.sessionFormat ||
        preview.genderPreference ||
        preview.radiusLabel ||
        preview.inquiryTopics.length > 0)
  );

  return createPortal(
    <div className="dashboard-modal" role="presentation" onClick={onClose}>
      <div
        className="dashboard-modal__dialog inquiry-client-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-client-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-modal__glow" aria-hidden />
        <div className="dashboard-modal__content">
          {loading ? (
            <>
              <div className="inquiry-client-preview__loading-shell">
                {preview ? (
                  <div className="inquiry-client-preview__hero inquiry-client-preview__hero--loading">
                    <InquiryAvatar
                      name={preview.name}
                      src={preview.avatarUrl}
                      size="lg"
                    />
                    <div>
                      <p className="inquiry-client-preview__eyebrow">
                        Client profile
                      </p>
                      <h2
                        id="inquiry-client-preview-title"
                        className="inquiry-client-preview__name"
                      >
                        {preview.name}
                      </h2>
                    </div>
                  </div>
                ) : null}
                <div
                  className="inquiry-client-preview__skeleton"
                  aria-hidden
                >
                  <span className="inquiry-client-preview__skeleton-line" />
                  <span className="inquiry-client-preview__skeleton-line inquiry-client-preview__skeleton-line--short" />
                  <span className="inquiry-client-preview__skeleton-line" />
                  <span className="inquiry-client-preview__skeleton-chips">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
              <p className="inquiry-client-preview__loading" role="status">
                Loading profile…
              </p>
            </>
          ) : preview ? (
            <>
              <div className="inquiry-client-preview__hero">
                <InquiryAvatar
                  name={preview.name}
                  src={preview.avatarUrl}
                  size="lg"
                />
                <div>
                  <p className="inquiry-client-preview__eyebrow">Client profile</p>
                  <h2
                    id="inquiry-client-preview-title"
                    className="inquiry-client-preview__name"
                  >
                    {preview.name}
                  </h2>
                  {preview.location ? (
                    <p className="inquiry-client-preview__location">
                      {preview.location}
                    </p>
                  ) : null}
                </div>
              </div>
              <ChipList label="Goals" items={preview.goals} />
              <ChipList label="Looking for" items={preview.professions} />
              <ChipList label="Specialties" items={preview.specialties} />
              <StatRow label="Budget" value={preview.budgetLabel} />
              <StatRow label="Session format" value={preview.sessionFormat} />
              <StatRow label="Specialist preference" value={preview.genderPreference} />
              <StatRow label="Search radius" value={preview.radiusLabel} />
              <ChipList label="This inquiry" items={preview.inquiryTopics} />
              {!hasDetails ? (
                <p className="inquiry-client-preview__empty">
                  This client hasn’t added profile details yet.
                </p>
              ) : null}
            </>
          ) : (
            <p className="inquiry-client-preview__empty">
              Client profile isn’t available for this conversation.
            </p>
          )}
          <button
            type="button"
            className="smoac-control inquiry-client-preview__close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface InquiryDeleteConfirmModalProps {
  open: boolean;
  name: string;
  count?: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function InquiryDeleteConfirmModal({
  open,
  name,
  count = 1,
  busy = false,
  onCancel,
  onConfirm,
}: InquiryDeleteConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="dashboard-modal" role="presentation" onClick={onCancel}>
      <div
        className="dashboard-modal__dialog dashboard-modal__dialog--signout"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-delete-title"
        aria-describedby="inquiry-delete-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-modal__glow" aria-hidden />
        <div className="dashboard-modal__content">
          <h2 id="inquiry-delete-title" className="dashboard-modal__title">
            {count > 1 ? "Delete conversations?" : "Delete conversation?"}
          </h2>
          <p id="inquiry-delete-desc" className="dashboard-modal__body">
            {count > 1
              ? `${count} conversations will be removed from your Inquiries. Those clients can still message you later.`
              : `${name.trim() || "This client"} will be removed from your Inquiries. They can still message you later.`}
          </p>
          <div className="dashboard-modal__actions">
            <button
              type="button"
              className="smoac-control dashboard-modal__cancel"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              ref={confirmRef}
              type="button"
              className="smoac-control inquiry-delete-confirm"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

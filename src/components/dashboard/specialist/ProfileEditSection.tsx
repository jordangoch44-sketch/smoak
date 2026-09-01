"use client";

import type { ReactNode } from "react";
import { AlertTriangleIcon, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface ProfileEditSectionProps {
  id: string;
  title: string;
  description?: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  viewContent: ReactNode;
  editContent: ReactNode;
  saving?: boolean;
  incomplete?: boolean;
  highlighted?: boolean;
}

export function ProfileEditSection({
  id,
  title,
  description,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  viewContent,
  editContent,
  saving = false,
  incomplete,
  highlighted = false,
}: ProfileEditSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "profile-edit-section",
        isEditing && "profile-edit-section--editing",
        highlighted && "profile-edit-section--highlighted"
      )}
      aria-labelledby={`${id}-title`}
    >
      <header className="profile-edit-section__head">
        <div className="profile-edit-section__intro">
          <div className="profile-edit-section__title-row">
            <h2 id={`${id}-title`} className="profile-edit-section__title">
              {title}
            </h2>
            {incomplete !== undefined ? (
              incomplete ? (
                <span
                  className="profile-edit-section__status-badge profile-edit-section__status-badge--incomplete"
                  title="Needs attention"
                  aria-label="Needs attention"
                >
                  <AlertTriangleIcon className="profile-edit-section__status-badge-icon" />
                </span>
              ) : (
                <span
                  className="profile-edit-section__status-badge profile-edit-section__status-badge--complete"
                  title="Complete"
                  aria-label="Complete"
                >
                  <CheckIcon className="profile-edit-section__status-badge-icon" />
                </span>
              )
            ) : null}
          </div>
          {description ? (
            <p className="profile-edit-section__desc">{description}</p>
          ) : null}
        </div>
        {!isEditing ? (
          <button
            type="button"
            className="profile-edit-section__edit-btn"
            onClick={onEdit}
          >
            Edit
          </button>
        ) : null}
      </header>

      <div className="profile-edit-section__body">
        {isEditing ? editContent : viewContent}
      </div>

      {isEditing ? (
        <footer className="profile-edit-section__actions">
          <button
            type="button"
            className="profile-edit-section__cancel-btn"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dashboard-primary-btn profile-edit-section__save-btn"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </footer>
      ) : null}
    </section>
  );
}

interface ProfileEditViewFieldProps {
  label: string;
  value?: string | null;
  emptyLabel?: string;
  multiline?: boolean;
}

export function ProfileEditViewField({
  label,
  value,
  emptyLabel = "Not added",
  multiline = false,
}: ProfileEditViewFieldProps) {
  const display = value?.trim() || emptyLabel;
  const isEmpty = !value?.trim();

  return (
    <div className="profile-edit-field profile-edit-field--view">
      <span className="profile-edit-field__label">{label}</span>
      {multiline ? (
        <p
          className={cn(
            "profile-edit-field__value profile-edit-field__value--multiline",
            isEmpty && "profile-edit-field__value--empty"
          )}
        >
          {display}
        </p>
      ) : (
        <p
          className={cn(
            "profile-edit-field__value",
            isEmpty && "profile-edit-field__value--empty"
          )}
        >
          {display}
        </p>
      )}
    </div>
  );
}

interface ProfileEditInputFieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function ProfileEditInputField({
  label,
  children,
  hint,
}: ProfileEditInputFieldProps) {
  return (
    <label className="profile-edit-field profile-edit-field--edit login-field">
      <span className="profile-edit-field__label login-field__label">{label}</span>
      {children}
      {hint ? <span className="dashboard-edit-hint">{hint}</span> : null}
    </label>
  );
}

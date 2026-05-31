"use client";

import type { ReactNode } from "react";
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
}: ProfileEditSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "profile-edit-section",
        isEditing && "profile-edit-section--editing"
      )}
      aria-labelledby={`${id}-title`}
    >
      <header className="profile-edit-section__head">
        <div className="profile-edit-section__intro">
          <h2 id={`${id}-title`} className="profile-edit-section__title">
            {title}
          </h2>
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

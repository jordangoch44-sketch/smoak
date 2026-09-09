"use client";

import { useMemo, useState } from "react";
import {
  ADMIN_EMAIL_AUDIENCE_OPTIONS,
  ADMIN_EMAIL_TRIGGER_OPTIONS,
  buildAdminEmailPreviewHtml,
  defaultTriggerLabel,
  validateAdminEmail,
} from "@/lib/admin-email-catalog";
import type {
  AdminEmailAudienceId,
  AdminEmailTriggerKind,
  AdminManagedEmail,
} from "@/types/admin-email";
import { cn } from "@/lib/utils";

export type AdminEmailEditorAction =
  | "draft"
  | "activate"
  | "pause"
  | "schedule"
  | "send_now";

interface AdminEmailEditorProps {
  email: AdminManagedEmail;
  notice?: string | null;
  sending?: boolean;
  onCancel: () => void;
  onSave: (email: AdminManagedEmail, action: AdminEmailEditorAction) => void;
}

export function AdminEmailEditor({
  email,
  notice,
  sending = false,
  onCancel,
  onSave,
}: AdminEmailEditorProps) {
  const [draft, setDraft] = useState<AdminManagedEmail>(email);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop"
  );
  const [error, setError] = useState<string | null>(null);
  const [scheduleValue, setScheduleValue] = useState(
    toDatetimeLocal(email.scheduledAt)
  );

  const previewHtml = useMemo(
    () => buildAdminEmailPreviewHtml(draft),
    [draft]
  );

  function update<K extends keyof AdminManagedEmail>(
    key: K,
    value: AdminManagedEmail[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function toggleAudience(id: AdminEmailAudienceId) {
    setDraft((current) => {
      const has = current.audienceIds.includes(id);
      return {
        ...current,
        audienceIds: has
          ? current.audienceIds.filter((item) => item !== id)
          : [...current.audienceIds, id],
      };
    });
    setError(null);
  }

  function setTriggerKind(triggerKind: AdminEmailTriggerKind) {
    setDraft((current) => ({
      ...current,
      triggerKind,
      triggerLabel: defaultTriggerLabel(triggerKind),
    }));
  }

  function commit(action: AdminEmailEditorAction) {
    const next: AdminManagedEmail = {
      ...draft,
      name: draft.name.trim(),
      subject: draft.subject.trim(),
      title: draft.title.trim(),
      body: draft.body.trim(),
      scheduledAt:
        action === "schedule" && scheduleValue
          ? new Date(scheduleValue).toISOString()
          : draft.scheduledAt,
      status:
        action === "activate"
          ? "active"
          : action === "pause"
            ? "paused"
            : action === "schedule"
              ? "scheduled"
              : action === "send_now"
                ? draft.status
                : "draft",
      queuedForSend: action === "send_now",
    };
    const invalid = validateAdminEmail(next);
    if (invalid) {
      setError(invalid);
      return;
    }
    onSave(next, action);
  }

  const isOneTime = draft.kind === "one_time";

  return (
    <div className="admin-email-editor">
      <div className="admin-email-editor__toolbar">
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel}>
          Back to list
        </button>
        <div className="admin-email-editor__toolbar-actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            disabled={sending}
            onClick={() => commit("draft")}
          >
            Save draft
          </button>
          {isOneTime ? (
            <>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                disabled={sending}
                onClick={() => commit("schedule")}
              >
                Schedule
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={sending}
                onClick={() => commit("send_now")}
              >
                {sending ? "Sending…" : "Send now"}
              </button>
            </>
          ) : draft.status === "active" ? (
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={sending}
              onClick={() => commit("pause")}
            >
              Pause
            </button>
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={sending}
              onClick={() => commit("activate")}
            >
              Activate
            </button>
          )}
        </div>
      </div>

      {notice ? <p className="admin-email-banner">{notice}</p> : null}
      {error ? <p className="admin-status-error">{error}</p> : null}

      <div className="admin-email-editor__grid">
        <form
          className="admin-email-editor__form"
          onSubmit={(event) => {
            event.preventDefault();
            commit("draft");
          }}
        >
          <label className="admin-email-field">
            <span>Name</span>
            <input
              className="admin-field"
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Welcome to SMOAC"
            />
          </label>
          <label className="admin-email-field">
            <span>Subject</span>
            <input
              className="admin-field"
              value={draft.subject}
              onChange={(event) => update("subject", event.target.value)}
              placeholder="Your SMOAC account is live"
            />
          </label>
          <label className="admin-email-field">
            <span>Preheader</span>
            <input
              className="admin-field"
              value={draft.preheader}
              onChange={(event) => update("preheader", event.target.value)}
              placeholder="Inbox preview text"
            />
          </label>
          <div className="admin-email-field-row">
            <label className="admin-email-field">
              <span>Eyebrow</span>
              <input
                className="admin-field"
                value={draft.eyebrow}
                onChange={(event) => update("eyebrow", event.target.value)}
                placeholder="Welcome"
              />
            </label>
            <label className="admin-email-field">
              <span>Heading</span>
              <input
                className="admin-field"
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Shown at the top of the email"
              />
            </label>
          </div>
          <label className="admin-email-field">
            <span>Email content</span>
            <textarea
              className="admin-field admin-field--textarea admin-email-field__body"
              value={draft.body}
              onChange={(event) => update("body", event.target.value)}
              placeholder="Write the message. Separate paragraphs with a blank line."
              rows={8}
            />
          </label>
          <label className="admin-email-field">
            <span>Image URL</span>
            <input
              className="admin-field"
              value={draft.imageUrl}
              onChange={(event) => update("imageUrl", event.target.value)}
              placeholder="https://"
            />
          </label>
          <div className="admin-email-field-row">
            <label className="admin-email-field">
              <span>Button label</span>
              <input
                className="admin-field"
                value={draft.ctaLabel}
                onChange={(event) => update("ctaLabel", event.target.value)}
                placeholder="Open dashboard"
              />
            </label>
            <label className="admin-email-field">
              <span>Button link</span>
              <input
                className="admin-field"
                value={draft.ctaHref}
                onChange={(event) => update("ctaHref", event.target.value)}
                placeholder="/specialist-dashboard"
              />
            </label>
          </div>

          <fieldset className="admin-email-fieldset">
            <legend>Trigger & timing</legend>
            <label className="admin-email-field">
              <span>Trigger</span>
              <select
                className="admin-field admin-field--select"
                value={draft.triggerKind}
                onChange={(event) =>
                  setTriggerKind(event.target.value as AdminEmailTriggerKind)
                }
              >
                {ADMIN_EMAIL_TRIGGER_OPTIONS.filter((option) =>
                  isOneTime
                    ? option.id === "one_time" || option.id === "custom"
                    : option.id !== "one_time"
                ).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-email-field">
              <span>Trigger label</span>
              <input
                className="admin-field"
                value={draft.triggerLabel}
                onChange={(event) => update("triggerLabel", event.target.value)}
                placeholder="Weekly (Mon)"
              />
            </label>
            {isOneTime ? (
              <label className="admin-email-field">
                <span>Schedule</span>
                <input
                  className="admin-field"
                  type="datetime-local"
                  value={scheduleValue}
                  onChange={(event) => setScheduleValue(event.target.value)}
                />
              </label>
            ) : null}
          </fieldset>

          <fieldset className="admin-email-fieldset">
            <legend>Audience</legend>
            <div className="admin-email-audience-grid">
              {ADMIN_EMAIL_AUDIENCE_OPTIONS.map((option) => {
                const checked = draft.audienceIds.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "admin-email-audience",
                      checked && "admin-email-audience--on"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAudience(option.id)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <em>{option.hint}</em>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="admin-email-check">
            <input
              type="checkbox"
              checked={draft.includeUnsubscribe}
              onChange={(event) =>
                update("includeUnsubscribe", event.target.checked)
              }
            />
            Include unsubscribe link (required for marketing email)
          </label>
        </form>

        <aside className="admin-email-preview">
          <div className="admin-email-preview__bar">
            <span>Preview</span>
            <div className="admin-app-segments" role="tablist" aria-label="Preview size">
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === "desktop"}
                className={cn(
                  "admin-app-segment",
                  previewMode === "desktop" && "admin-app-segment--active"
                )}
                onClick={() => setPreviewMode("desktop")}
              >
                Desktop
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === "mobile"}
                className={cn(
                  "admin-app-segment",
                  previewMode === "mobile" && "admin-app-segment--active"
                )}
                onClick={() => setPreviewMode("mobile")}
              >
                Mobile
              </button>
            </div>
          </div>
          <div
            className={cn(
              "admin-email-preview__stage",
              previewMode === "mobile" && "admin-email-preview__stage--mobile"
            )}
          >
            <iframe
              title="Email preview"
              className="admin-email-preview__frame"
              srcDoc={previewHtml}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

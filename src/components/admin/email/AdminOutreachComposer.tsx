"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AdminOutreachSend,
  AdminOutreachTemplate,
} from "@/lib/admin-outreach";
import { isTrainerDiscoveryOutreach } from "@/lib/email/trainer-outreach-email";

type EditorState =
  | { mode: "closed" }
  | { mode: "new" }
  | { mode: "edit"; id: string };

function formatSentAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminOutreachComposer() {
  const [templates, setTemplates] = useState<AdminOutreachTemplate[]>([]);
  const [sends, setSends] = useState<AdminOutreachSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/outreach");
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      templates?: AdminOutreachTemplate[];
      sends?: AdminOutreachSend[];
    } | null;
    if (!res.ok || !data?.ok) {
      setLoadError(data?.message || "Could not load templates.");
      setLoading(false);
      return;
    }
    setTemplates(data.templates ?? []);
    setSends(data.sends ?? []);
    setLoadError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setEditor({ mode: "new" });
    setName("");
    setSubject("");
    setBody("");
    setNotice(null);
    setError(null);
  }

  function openEdit(template: AdminOutreachTemplate) {
    setEditor({ mode: "edit", id: template.id });
    setName(template.name);
    setSubject(template.subject);
    setBody(template.body);
    setSelectedId(template.id);
    setNotice(null);
    setError(null);
  }

  function selectTemplate(template: AdminOutreachTemplate) {
    setSelectedId(template.id);
    setTo("");
    setNotice(null);
    setError(null);
    if (editor.mode === "edit" && editor.id !== template.id) {
      setEditor({ mode: "closed" });
    }
  }

  async function saveTemplate() {
    setSaving(true);
    setNotice(null);
    setError(null);
    const creating = editor.mode === "new";
    const res = await fetch("/api/admin/outreach", {
      method: creating ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editor.mode === "edit" ? editor.id : undefined,
        name,
        subject,
        body,
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      template?: AdminOutreachTemplate;
    } | null;
    setSaving(false);
    if (!res.ok || !data?.ok || !data.template) {
      setError(data?.message || "Could not save.");
      return;
    }
    setNotice(creating ? "Template added." : "Template saved.");
    setEditor({ mode: "closed" });
    setSelectedId(data.template.id);
    await load();
  }

  async function removeTemplate(template: AdminOutreachTemplate) {
    if (!window.confirm(`Delete “${template.name}”?`)) return;
    setError(null);
    setNotice(null);
    const res = await fetch(
      `/api/admin/outreach?id=${encodeURIComponent(template.id)}`,
      { method: "DELETE" }
    );
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
    } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.message || "Could not delete.");
      return;
    }
    if (selectedId === template.id) setSelectedId(null);
    setEditor({ mode: "closed" });
    setNotice("Template deleted.");
    await load();
  }

  async function sendTo(template: AdminOutreachTemplate, confirmResend = false) {
    const address = to.trim();
    if (!address) {
      setError("Type the email address.");
      return;
    }
    if (
      !confirmResend &&
      !window.confirm(`Send “${template.name}” to ${address}?`)
    ) {
      return;
    }
    setSending(true);
    setNotice(null);
    setError(null);
    const res = await fetch("/api/admin/outreach/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: template.id,
        to: address,
        confirmResend,
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      alreadySent?: boolean;
    } | null;
    setSending(false);

    if (res.status === 409 && data?.alreadySent) {
      if (
        window.confirm(
          data.message || `Already sent to ${address}. Send again?`
        )
      ) {
        await sendTo(template, true);
      }
      return;
    }

    if (!res.ok || !data?.ok) {
      setError(data?.message || "Could not send.");
      return;
    }
    setNotice(data.message || "Sent.");
    setTo("");
    await load();
  }

  const selected = templates.find((template) => template.id === selectedId) ?? null;

  return (
    <section className="admin-outreach" aria-label="Templates">
      <div className="admin-outreach__head">
        <div>
          <p className="admin-email-hero__eyebrow">Cold outreach</p>
          <h2>Templates</h2>
          <p>
            Save a message for independent trainers, gyms, or anyone else.
            Click it, type an address, and send.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={openNew}
        >
          + New template
        </button>
      </div>

      {loadError ? <p className="admin-outreach__error">{loadError}</p> : null}
      {error ? <p className="admin-outreach__error">{error}</p> : null}
      {notice ? <p className="admin-outreach__notice">{notice}</p> : null}

      {editor.mode !== "closed" ? (
        <form
          className="admin-outreach__editor"
          onSubmit={(event) => {
            event.preventDefault();
            void saveTemplate();
          }}
        >
          <label className="admin-email-field">
            Name
            <input
              className="admin-field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Independent trainers"
              maxLength={80}
            />
          </label>
          <label className="admin-email-field">
            Subject
            <input
              className="admin-field"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject line"
              maxLength={200}
            />
          </label>
          <label className="admin-email-field">
            Message
            <textarea
              className="admin-field admin-field--textarea admin-outreach__body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Paste the message you send to this group."
              maxLength={8000}
            />
          </label>
          <div className="admin-outreach__editor-actions">
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save template"}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => setEditor({ mode: "closed" })}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="admin-empty">Loading templates…</p>
      ) : loadError ? null : templates.length === 0 ? (
        <p className="admin-empty">
          No templates yet. Add one for independent trainers, gyms, or
          another group.
        </p>
      ) : (
        <ul className="admin-outreach__list">
          {templates.map((template) => {
            const active = template.id === selectedId;
            return (
              <li key={template.id}>
                <button
                  type="button"
                  className={
                    active
                      ? "admin-outreach__card admin-outreach__card--active"
                      : "admin-outreach__card"
                  }
                  onClick={() => selectTemplate(template)}
                >
                  <strong>{template.name}</strong>
                  <span>{template.subject || "No subject yet"}</span>
                </button>
                <div className="admin-outreach__card-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost admin-btn--compact"
                    onClick={() => openEdit(template)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost admin-btn--compact"
                    onClick={() => void removeTemplate(template)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selected ? (
        <form
          className="admin-outreach__send"
          onSubmit={(event) => {
            event.preventDefault();
            void sendTo(selected);
          }}
        >
          <label className="admin-email-field">
            Send “{selected.name}” to
            <input
              className="admin-field"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="name@email.com"
              autoFocus
            />
          </label>
          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            disabled={sending || !to.trim()}
          >
            {sending ? "Sending…" : "Send"}
          </button>
          {isTrainerDiscoveryOutreach(selected.subject, selected.body) ? (
            <p className="admin-outreach__hint">
              This one sends as the designed layout: headline, map on an iPhone,
              and a signup button. The link in the saved message is the button.
            </p>
          ) : null}
        </form>
      ) : null}

      {sends.length > 0 ? (
        <ul className="admin-outreach__log">
          {sends.map((row) => (
            <li key={row.id}>
              <span>
                {row.templateName || "Template"} → {row.toEmail}
              </span>
              <span>
                {row.status === "sent" ? "Sent" : "Failed"}
                {row.createdAt ? ` · ${formatSentAt(row.createdAt)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { OutreachDialog } from "@/components/admin/outreach/OutreachDialog";
import type { AdminOutreachTemplate } from "@/lib/admin-outreach";
import { formatOutreachDate } from "@/lib/outreach/catalog";

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
}

const EMPTY = { name: "", subject: "", body: "" };

export function OutreachTemplatesTab({
  onLiveSends,
}: {
  onLiveSends?: (live: boolean) => void;
}) {
  const [templates, setTemplates] = useState<AdminOutreachTemplate[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<typeof EMPTY | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/outreach?includeArchived=1", {
      credentials: "include",
    });
    const data = await readJson(res);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Could not load templates.");
      return;
    }
    setTemplates((data.templates as AdminOutreachTemplate[]) ?? []);
    if (typeof data.liveSends === "boolean") onLiveSends?.(data.liveSends);
  }, [onLiveSends]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = templates.filter((template) =>
    showArchived ? Boolean(template.archivedAt) : !template.archivedAt
  );

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/outreach", {
      method: editingId ? "PUT" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...draft } : draft),
    });
    const data = await readJson(res);
    setSaving(false);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Could not save that template.");
      return;
    }
    setDraft(null);
    setEditingId(null);
    setNotice("Template saved.");
    await load();
  }

  async function duplicate(id: string) {
    const res = await fetch("/api/admin/outreach/duplicate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await readJson(res);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Could not duplicate that template.");
      return;
    }
    setNotice("Template duplicated.");
    await load();
  }

  async function archive(id: string, archived: boolean) {
    const res = await fetch("/api/admin/outreach/archive", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, archived }),
    });
    const data = await readJson(res);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Could not update that template.");
      return;
    }
    await load();
  }

  async function preview(template: AdminOutreachTemplate) {
    const res = await fetch("/api/admin/outreach/campaigns/preview", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: template.id,
        prospectIds: [],
        sample: {
          name: "Alex Rivera",
          business: "North Park Strength",
          email: "preview@smoac.com",
        },
      }),
    });
    const data = await readJson(res);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Could not preview that template.");
      return;
    }
    setPreviewSubject(typeof data.subject === "string" ? data.subject : template.subject);
    setPreviewHtml(typeof data.html === "string" ? data.html : "");
  }

  return (
    <div className="admin-outreach-crm__panel">
      <div className="admin-outreach-crm__toolbar">
        <div>
          <h2>Templates</h2>
          <p>
            Use {"{{first_name}}"} and {"{{business_name}}"}. A missing first name becomes “there”, so “Hi {"{{first_name}}"}” reads “Hi there”.
          </p>
        </div>
        <div className="admin-actions">
          <label className="admin-outreach-crm__check">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            Archived
          </label>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => {
              setEditingId(null);
              setDraft(EMPTY);
            }}
          >
            New template
          </button>
        </div>
      </div>
      {error ? <p className="admin-outreach-crm__error">{error}</p> : null}
      {notice ? <p className="admin-outreach-crm__notice">{notice}</p> : null}
      {visible.length === 0 ? (
        <p className="admin-outreach-crm__muted">
          No templates yet. Create one here, or on the Email tab.
        </p>
      ) : null}
      <ul className="admin-outreach-crm__campaigns">
        {visible.map((template) => (
          <li key={template.id} className="admin-entity-card">
            <div className="admin-entity-card__head">
              <div>
                <h3 className="admin-entity-card__title">{template.name}</h3>
                <p className="admin-entity-card__sub">{template.subject}</p>
              </div>
              <span className="admin-outreach-crm__muted">
                {formatOutreachDate(template.updatedAt)}
              </span>
            </div>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn admin-btn--compact"
                onClick={() => {
                  setEditingId(template.id);
                  setDraft({
                    name: template.name,
                    subject: template.subject,
                    body: template.body,
                  });
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--compact"
                onClick={() => void preview(template)}
              >
                Preview
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--compact"
                onClick={() => void duplicate(template.id)}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--compact"
                onClick={() => void archive(template.id, !template.archivedAt)}
              >
                {template.archivedAt ? "Restore" : "Archive"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {draft ? (
        <OutreachDialog
          title={editingId ? "Edit template" : "New template"}
          wide
          onClose={() => setDraft(null)}
        >
          <div className="admin-outreach-crm__form">
            <label className="admin-field-label">
              Name
              <input
                className="admin-field"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, name: event.target.value } : current))
                }
              />
            </label>
            <label className="admin-field-label">
              Subject
              <input
                className="admin-field"
                value={draft.subject}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, subject: event.target.value } : current
                  )
                }
              />
            </label>
            <label className="admin-field-label">
              Body
              <textarea
                className="admin-field admin-field--textarea"
                rows={10}
                value={draft.body}
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, body: event.target.value } : current))
                }
              />
            </label>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save template"}
            </button>
          </div>
        </OutreachDialog>
      ) : null}

      {previewHtml ? (
        <OutreachDialog title={previewSubject || "Preview"} wide onClose={() => setPreviewHtml(null)}>
          <iframe className="admin-outreach-crm__frame" title="Template preview" sandbox="" srcDoc={previewHtml} />
        </OutreachDialog>
      ) : null}
    </div>
  );
}

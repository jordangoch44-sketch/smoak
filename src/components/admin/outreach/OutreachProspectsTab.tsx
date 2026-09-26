"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OutreachDialog } from "@/components/admin/outreach/OutreachDialog";
import {
  OUTREACH_STATUSES,
  formatOutreachDate,
  instagramProgressLabel,
  outreachStatusLabel,
  type OutreachStatus,
} from "@/lib/outreach/catalog";
import {
  emptyOutreachCsvMapping,
  guessOutreachCsvMapping,
  mapOutreachCsvRows,
  parseOutreachCsv,
  type OutreachCsvMapping,
  OUTREACH_CSV_COLUMNS,
} from "@/lib/outreach/csv";
import type { OutreachProspect, OutreachImportPreview } from "@/lib/outreach/prospects";

type SortKey =
  | "name"
  | "email"
  | "business"
  | "category"
  | "status"
  | "source"
  | "last_contacted_at";

const EMPTY_FORM = {
  name: "",
  email: "",
  instagram: "",
  business: "",
  category: "",
  website: "",
  notes: "",
  status: "not_contacted" as OutreachStatus,
};

function formatHistoryEvent(eventType: string, detail: string): string {
  const label =
    eventType === "instagram_messaged"
      ? "Instagram messaged"
      : eventType === "instagram_replied"
        ? "Instagram responded"
        : eventType.replaceAll("_", " ");
  return detail ? `${label} · ${detail}` : label;
}

function InstagramLog({
  row,
  onLog,
}: {
  row: OutreachProspect;
  onLog: (ids: string[], action: "messaged" | "responded" | "undo") => void;
}) {
  if (!row.instagram) return null;
  const tone = row.instagramRepliedAt
    ? "responded"
    : row.instagramTouches > 0
      ? "messaged"
      : "open";
  const canUndo = row.instagramTouches > 0 || Boolean(row.instagramRepliedAt);
  return (
    <div className="admin-outreach-crm__ig">
      <span className={`admin-badge admin-outreach-ig admin-outreach-ig--${tone}`}>
        {instagramProgressLabel(row)}
      </span>
      <span className="admin-outreach-crm__ig-actions">
        <button
          type="button"
          className="admin-btn admin-btn--compact"
          onClick={() => onLog([row.id], "messaged")}
        >
          Messaged
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--compact"
          disabled={Boolean(row.instagramRepliedAt)}
          onClick={() => onLog([row.id], "responded")}
        >
          Responded
        </button>
        {canUndo ? (
          <button
            type="button"
            className="admin-btn admin-btn--compact"
            title="Take back the last Instagram mark"
            onClick={() => onLog([row.id], "undo")}
          >
            Undo
          </button>
        ) : null}
      </span>
    </div>
  );
}

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
}

export function OutreachProspectsTab({
  onLiveSends,
  onStartCampaign,
}: {
  onLiveSends: (live: boolean) => void;
  onStartCampaign: (ids: string[]) => void;
}) {
  const [prospects, setProspects] = useState<OutreachProspect[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState<"" | "instagram" | "email">("");
  const [igProgress, setIgProgress] = useState<"" | "open" | "messaged" | "responded">("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [archived, setArchived] = useState(false);
  const [sort, setSort] = useState<SortKey>("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OutreachStatus>("follow_up");
  const [form, setForm] = useState<typeof EMPTY_FORM | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<OutreachCsvMapping>(emptyOutreachCsvMapping());
  const [preview, setPreview] = useState<OutreachImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const pageSize = 25;

  useEffect(() => {
    const timer = window.setTimeout(() => setQ(qInput), 250);
    return () => window.clearTimeout(timer);
  }, [qInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      q,
      status,
      channel,
      ig: igProgress,
      category,
      source,
      sort,
      dir,
      page: String(page),
      pageSize: String(pageSize),
      archived: archived ? "1" : "0",
    });
    const res = await fetch(`/api/admin/outreach/prospects?${params}`, {
      credentials: "include",
    });
    const data = await readJson(res);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Could not load prospects.");
      if (typeof data?.liveSends === "boolean") onLiveSends(data.liveSends);
      setLoading(false);
      return;
    }
    setProspects((data.prospects as OutreachProspect[]) ?? []);
    setTotal(typeof data.total === "number" ? data.total : 0);
    setCategories(Array.isArray(data.categories) ? (data.categories as string[]) : []);
    onLiveSends(data.liveSends === true);
    setLoading(false);
  }, [archived, category, channel, dir, igProgress, onLiveSends, page, q, sort, source, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const visibleIds = prospects.map((row) => row.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function openEdit(row: OutreachProspect) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      email: row.email ?? "",
      instagram: row.instagram,
      business: row.business,
      category: row.category,
      website: row.website,
      notes: row.notes,
      status: row.status,
    });
    setHistory([]);
    const res = await fetch(`/api/admin/outreach/prospects/${row.id}`, {
      credentials: "include",
    });
    const data = await readJson(res);
    if (res.ok && data?.ok && Array.isArray(data.events)) {
      setHistory(
        (data.events as Array<{ eventType?: string; detail?: string; createdAt?: string }>).map(
          (event) =>
            `${formatOutreachDate(event.createdAt ?? null)} · ${formatHistoryEvent(
              event.eventType ?? "event",
              event.detail ?? ""
            )}`
        )
      );
    }
  }

  async function saveForm() {
    if (!form) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/outreach/prospects", {
      method: editingId ? "PATCH" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
    });
    const data = await readJson(res);
    setSaving(false);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Could not save that prospect.");
      return;
    }
    setForm(null);
    setEditingId(null);
    setNotice(editingId ? "Prospect updated." : "Prospect added.");
    await load();
  }

  async function runBulk(action: "archive" | "restore" | "delete" | "status") {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (action === "delete") {
      const confirmed = window.confirm(
        `Delete ${ids.length} prospect${ids.length === 1 ? "" : "s"}? This cannot be undone.`
      );
      if (!confirmed) return;
    }
    const res = await fetch("/api/admin/outreach/prospects/bulk", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids,
        action,
        status: action === "status" ? bulkStatus : undefined,
      }),
    });
    const data = await readJson(res);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "That bulk action failed.");
      return;
    }
    setSelected(new Set());
    setNotice("Contacts updated.");
    await load();
  }

  async function logInstagram(
    ids: string[],
    action: "messaged" | "responded" | "undo"
  ) {
    if (ids.length === 0) return;
    setError(null);
    const res = await fetch("/api/admin/outreach/prospects/bulk", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids,
        action:
          action === "messaged"
            ? "instagram_messaged"
            : action === "responded"
              ? "instagram_responded"
              : "instagram_undo",
      }),
    });
    const data = await readJson(res);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Could not save that Instagram note.");
      return;
    }
    const count = typeof data.count === "number" ? data.count : ids.length;
    setNotice(
      action === "undo"
        ? `Undid the last Instagram mark on ${count} contact${count === 1 ? "" : "s"}.`
        : action === "messaged"
          ? `Logged ${count} Instagram message${count === 1 ? "" : "s"}.`
          : `Marked ${count} Instagram repl${count === 1 ? "y" : "ies"}.`
    );
    await load();
  }

  function onCsvFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseOutreachCsv(String(reader.result ?? ""));
      if ("error" in parsed) {
        setError(parsed.error);
        return;
      }
      setCsvHeaders(parsed.headers);
      setCsvRows(parsed.rows);
      setMapping(guessOutreachCsvMapping(parsed.headers));
      setPreview(null);
      setImportOpen(true);
    };
    reader.readAsText(file);
  }

  const mappedRows = useMemo(() => {
    if (!importOpen || csvHeaders.length === 0) return [];
    return mapOutreachCsvRows({ headers: csvHeaders, rows: csvRows }, mapping);
  }, [csvHeaders, csvRows, importOpen, mapping]);

  async function reviewImport() {
    setImporting(true);
    setError(null);
    const res = await fetch("/api/admin/outreach/prospects/import", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: mappedRows, commit: false }),
    });
    const data = await readJson(res);
    setImporting(false);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Could not review that file.");
      return;
    }
    setPreview(data.preview as OutreachImportPreview);
  }

  async function commitImport() {
    setImporting(true);
    const res = await fetch("/api/admin/outreach/prospects/import", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: mappedRows, commit: true }),
    });
    const data = await readJson(res);
    setImporting(false);
    if (!res.ok || !data?.ok) {
      setError(typeof data?.message === "string" ? data.message : "Import failed.");
      return;
    }
    const imported = typeof data.imported === "number" ? data.imported : 0;
    setImportOpen(false);
    setPreview(null);
    const instagramOnly = preview?.instagramOnly ?? 0;
    if (instagramOnly > 0 && (preview?.validEmails ?? 0) === 0) {
      setChannel("instagram");
      setIgProgress("");
      setStatus("");
    }
    setNotice(
      imported === 0
        ? "No new contacts. Matching emails were left as they are."
        : instagramOnly > 0
          ? `Imported ${imported} contact${imported === 1 ? "" : "s"}. Use Instagram to mark who you message.`
          : `Imported ${imported} contact${imported === 1 ? "" : "s"}.`
    );
    setPage(1);
    await load();
  }

  function instagramLabel(handle: string): string {
    if (!handle) return "—";
    return handle.startsWith("@") ? handle : `@${handle}`;
  }

  return (
    <div className="admin-outreach-crm__panel">
      <div className="admin-outreach-crm__toolbar">
        <div>
          <h2>Contacts</h2>
          <p>
            {total} contact{total === 1 ? "" : "s"}
            {channel === "instagram" ? " on Instagram" : channel === "email" ? " with email" : ""}
          </p>
        </div>
        <div className="admin-actions">
          <label className="admin-btn admin-btn--secondary">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                onCsvFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => {
              setEditingId(null);
              setHistory([]);
              setForm(EMPTY_FORM);
            }}
          >
            Add prospect
          </button>
        </div>
      </div>

      {error ? <p className="admin-outreach-crm__error">{error}</p> : null}
      {notice ? <p className="admin-outreach-crm__notice">{notice}</p> : null}

      <div className="admin-outreach-crm__chips" role="group" aria-label="Contact type">
        {(
          [
            ["", "All"],
            ["instagram", "Instagram"],
            ["email", "Email"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={label}
            type="button"
            className={
              channel === value
                ? "admin-outreach-crm__chip admin-outreach-crm__chip--active"
                : "admin-outreach-crm__chip"
            }
            aria-pressed={channel === value}
            onClick={() => {
              setPage(1);
              setChannel(value);
              if (value !== "instagram") setIgProgress("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {channel === "instagram" ? (
        <div className="admin-outreach-crm__chips" role="group" aria-label="Instagram progress">
          {(
            [
              ["", "Any"],
              ["open", "Not messaged"],
              ["messaged", "Messaged"],
              ["responded", "Responded"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              className={
                igProgress === value
                  ? "admin-outreach-crm__chip admin-outreach-crm__chip--active"
                  : "admin-outreach-crm__chip"
              }
              aria-pressed={igProgress === value}
              onClick={() => {
                setPage(1);
                setIgProgress(value);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="admin-outreach-crm__filters">
        <input
          className="admin-field"
          value={qInput}
          placeholder="Search name, email, Instagram, business"
          onChange={(event) => {
            setPage(1);
            setQInput(event.target.value);
          }}
          aria-label="Search prospects"
        />
        <select
          className="admin-field admin-field--select"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {OUTREACH_STATUSES.map((item) => (
            <option key={item} value={item}>
              {outreachStatusLabel(item)}
            </option>
          ))}
        </select>
        <select
          className="admin-field admin-field--select"
          value={category}
          onChange={(event) => {
            setPage(1);
            setCategory(event.target.value);
          }}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className="admin-field admin-field--select"
          value={source}
          onChange={(event) => {
            setPage(1);
            setSource(event.target.value);
          }}
          aria-label="Filter by source"
        >
          <option value="">All sources</option>
          <option value="manual">Manual</option>
          <option value="csv">CSV</option>
        </select>
        <select
          className="admin-field admin-field--select"
          value={`${sort}:${dir}`}
          onChange={(event) => {
            const [nextSort, nextDir] = event.target.value.split(":");
            setSort(nextSort as SortKey);
            setDir(nextDir === "desc" ? "desc" : "asc");
          }}
          aria-label="Sort prospects"
        >
          <option value="name:asc">Name A–Z</option>
          <option value="name:desc">Name Z–A</option>
          <option value="email:asc">Email A–Z</option>
          <option value="status:asc">Status</option>
          <option value="last_contacted_at:desc">Last contacted</option>
          <option value="business:asc">Business</option>
          <option value="category:asc">Category</option>
          <option value="source:asc">Source</option>
        </select>
        <label className="admin-outreach-crm__check">
          <input
            type="checkbox"
            checked={archived}
            onChange={(event) => {
              setPage(1);
              setArchived(event.target.checked);
            }}
          />
          Archived
        </label>
      </div>

      {selected.size > 0 ? (
        <div className="admin-outreach-crm__bulk">
          <div className="admin-outreach-crm__bulk-row">
            <span>{selected.size} selected</span>
            <button
              type="button"
              className="admin-btn admin-btn--compact admin-btn--primary"
              onClick={() => onStartCampaign([...selected])}
            >
              New campaign
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--compact"
              onClick={() => void logInstagram([...selected], "messaged")}
            >
              Messaged
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--compact"
              onClick={() => void logInstagram([...selected], "responded")}
            >
              Responded
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--compact"
              onClick={() => void logInstagram([...selected], "undo")}
            >
              Undo
            </button>
          </div>
          <div className="admin-outreach-crm__bulk-row">
            <select
              className="admin-field admin-field--select"
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value as OutreachStatus)}
              aria-label="Bulk status"
            >
              {OUTREACH_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {outreachStatusLabel(item)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="admin-btn admin-btn--compact"
              onClick={() => void runBulk("status")}
            >
              Set status
            </button>
            {archived ? (
              <button
                type="button"
                className="admin-btn admin-btn--compact"
                onClick={() => void runBulk("restore")}
              >
                Restore
              </button>
            ) : (
              <button
                type="button"
                className="admin-btn admin-btn--compact"
                onClick={() => void runBulk("archive")}
              >
                Archive
              </button>
            )}
            <button
              type="button"
              className="admin-btn admin-btn--compact admin-btn--danger"
              onClick={() => void runBulk("delete")}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {loading ? <p className="admin-outreach-crm__muted">Loading prospects…</p> : null}

      {!loading && !error && prospects.length === 0 ? (
        <p className="admin-outreach-crm__muted">
          {channel === "instagram"
            ? "No Instagram contacts in this view."
            : "No contacts yet. Import a CSV or add one manually."}
        </p>
      ) : null}

      {prospects.length > 0 ? (
        <>
          <div className="admin-table-wrap admin-desktop-only">
            <table className="admin-table admin-outreach-crm__table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="Select all visible prospects"
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Instagram</th>
                  <th>Business</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Last contacted</th>
                  <th>Source</th>
                  <th>Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {prospects.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`Select ${row.name || row.email || "prospect"}`}
                      />
                    </td>
                    <td>{row.name || "—"}</td>
                    <td>{row.email || "—"}</td>
                    <td>
                      {row.instagram ? (
                        <div className="admin-outreach-crm__ig">
                          <a
                            href={`https://instagram.com/${row.instagram.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {instagramLabel(row.instagram)}
                          </a>
                          <InstagramLog row={row} onLog={(ids, action) => void logInstagram(ids, action)} />
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{row.business || "—"}</td>
                    <td>{row.category || "—"}</td>
                    <td>
                      <span className={`admin-badge admin-outreach-status admin-outreach-status--${row.status}`}>
                        {outreachStatusLabel(row.status)}
                      </span>
                    </td>
                    <td>{formatOutreachDate(row.lastContactedAt)}</td>
                    <td>{row.source}</td>
                    <td className="admin-outreach-crm__notes" title={row.notes}>
                      {row.notes || "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn--compact admin-btn--ghost"
                        onClick={() => void openEdit(row)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="admin-outreach-crm__cards admin-mobile-only">
            {prospects.map((row) => (
              <li key={row.id} className="admin-entity-card">
                <div className="admin-entity-card__head">
                  <label className="admin-outreach-crm__check">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                    />
                    <strong>{row.name || row.email || "Unnamed"}</strong>
                  </label>
                  <span className={`admin-badge admin-outreach-status admin-outreach-status--${row.status}`}>
                    {outreachStatusLabel(row.status)}
                  </span>
                </div>
                <p>{row.email || instagramLabel(row.instagram)}</p>
                <InstagramLog row={row} onLog={(ids, action) => void logInstagram(ids, action)} />
                <p>
                  {row.business || "No business"}
                  {row.category ? ` · ${row.category}` : ""}
                </p>
                <button
                  type="button"
                  className="admin-btn admin-btn--compact"
                  onClick={() => void openEdit(row)}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {pages > 1 ? (
        <div className="admin-outreach-crm__pager">
          <button
            type="button"
            className="admin-btn admin-btn--compact"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            className="admin-btn admin-btn--compact"
            disabled={page >= pages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      ) : null}

      {form ? (
        <OutreachDialog
          title={editingId ? "Edit prospect" : "Add prospect"}
          subtitle="Instagram-only contacts are labeled and never emailed automatically."
          onClose={() => setForm(null)}
        >
          <div className="admin-outreach-crm__form">
            {(
              [
                ["name", "Name"],
                ["email", "Email"],
                ["instagram", "Instagram"],
                ["business", "Business"],
                ["category", "Category"],
                ["website", "Website"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="admin-field-label">
                {label}
                <input
                  className="admin-field"
                  value={form[key]}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, [key]: event.target.value } : current
                    )
                  }
                />
              </label>
            ))}
            <label className="admin-field-label">
              Status
              <select
                className="admin-field admin-field--select"
                value={form.status}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? { ...current, status: event.target.value as OutreachStatus }
                      : current
                  )
                }
              >
                {OUTREACH_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {outreachStatusLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field-label">
              Notes
              <textarea
                className="admin-field admin-field--textarea"
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, notes: event.target.value } : current
                  )
                }
              />
            </label>
            {editingId && form.instagram ? (
              <p className="admin-outreach-crm__muted">
                Instagram:{" "}
                {instagramProgressLabel({
                  instagram: form.instagram,
                  instagramTouches:
                    prospects.find((row) => row.id === editingId)?.instagramTouches ?? 0,
                  instagramRepliedAt:
                    prospects.find((row) => row.id === editingId)?.instagramRepliedAt ?? null,
                })}
              </p>
            ) : null}
            {history.length > 0 ? (
              <div>
                <p className="admin-field-label">History</p>
                <ul className="admin-outreach-crm__history">
                  {history.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={saving}
                onClick={() => void saveForm()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => {
                    const id = editingId;
                    setForm(null);
                    setSelected(new Set([id]));
                    void fetch("/api/admin/outreach/prospects/bulk", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        ids: [id],
                        action: archived ? "restore" : "archive",
                      }),
                    }).then(() => load());
                  }}
                >
                  {archived ? "Restore" : "Archive"}
                </button>
              ) : null}
            </div>
          </div>
        </OutreachDialog>
      ) : null}

      {importOpen ? (
        <OutreachDialog
          title="Import CSV"
          subtitle="Map your spreadsheet columns, review the file, then import. Spaces inside an email or Instagram handle are removed. Existing emails are skipped."
          wide
          onClose={() => {
            setImportOpen(false);
            setPreview(null);
          }}
        >
          <div className="admin-outreach-crm__form">
            {OUTREACH_CSV_COLUMNS.map((column) => (
              <label key={column.key} className="admin-field-label">
                {column.label}
                <select
                  className="admin-field admin-field--select"
                  value={mapping[column.key]}
                  onChange={(event) =>
                    setMapping((current) => ({
                      ...current,
                      [column.key]: event.target.value,
                    }))
                  }
                >
                  <option value="">Skip</option>
                  {csvHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p className="admin-outreach-crm__muted">{csvRows.length} data rows in this file.</p>
            {preview ? (
              <dl className="admin-outreach-crm__stats">
                <div>
                  <dt>Total rows</dt>
                  <dd>{preview.totalRows}</dd>
                </div>
                <div>
                  <dt>Valid emails</dt>
                  <dd>{preview.validEmails}</dd>
                </div>
                <div>
                  <dt>Missing emails</dt>
                  <dd>{preview.missingEmails}</dd>
                </div>
                {preview.invalidEmails > 0 ? (
                  <div>
                    <dt>Invalid emails</dt>
                    <dd>{preview.invalidEmails}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Duplicate prospects</dt>
                  <dd>{preview.duplicateProspects}</dd>
                </div>
                <div>
                  <dt>Instagram only</dt>
                  <dd>{preview.instagramOnly}</dd>
                </div>
                <div>
                  <dt>Ready to import</dt>
                  <dd>{preview.readyToImport}</dd>
                </div>
              </dl>
            ) : null}
            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn"
                disabled={importing}
                onClick={() => void reviewImport()}
              >
                {importing ? "Checking…" : "Review import"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={importing || !preview || preview.readyToImport === 0}
                onClick={() => void commitImport()}
              >
                Import {preview?.readyToImport ?? 0}
              </button>
            </div>
            {preview && preview.instagramOnly > 0 ? (
              <p className="admin-outreach-crm__muted">
                Instagram-only rows are saved for manual outreach. They are not emailed.
              </p>
            ) : null}
          </div>
        </OutreachDialog>
      ) : null}
    </div>
  );
}

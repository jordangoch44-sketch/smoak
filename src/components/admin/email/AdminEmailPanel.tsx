"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import {
  AdminEmailEditor,
  type AdminEmailEditorAction,
} from "@/components/admin/email/AdminEmailEditor";
import { useAdminEmailCatalog } from "@/hooks/useAdminEmailCatalog";
import { useBlockingModalOpen } from "@/hooks/useBlockingModalOpen";
import {
  ADMIN_EMAIL_AUDIENCE_OPTIONS,
  ADMIN_EMAIL_STATUS_OPTIONS,
  ADMIN_EMAIL_TRIGGER_OPTIONS,
  createAdminEmailDraft,
  downloadAdminEmailsCsv,
  formatAudienceList,
  formatEmailDate,
  formatEmailPercent,
  filterAdminEmails,
  sortAdminEmails,
  type AdminEmailSortKey,
} from "@/lib/admin-email-catalog";
import type {
  AdminEmailAnalyticsRange,
  AdminEmailAudienceId,
  AdminEmailKind,
  AdminEmailStatus,
  AdminEmailTriggerKind,
  AdminManagedEmail,
  AdminEmailRecipient,
} from "@/types/admin-email";
import { cn } from "@/lib/utils";

type PanelView = "list" | "choose" | "editor";

export function AdminEmailPanel() {
  const {
    emails,
    live,
    analytics,
    refreshAnalytics,
    save,
    remove,
    setStatus,
    duplicate,
    sendNow,
    resendNonOpeners,
    loadRecipients,
    audienceCount,
  } = useAdminEmailCatalog();
  const [view, setView] = useState<PanelView>("list");
  const [editing, setEditing] = useState<AdminManagedEmail | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminEmailStatus | "all">(
    "all"
  );
  const [audienceFilter, setAudienceFilter] = useState<
    AdminEmailAudienceId | "all"
  >("all");
  const [triggerFilter, setTriggerFilter] = useState<
    AdminEmailTriggerKind | "all"
  >("all");
  const [sort, setSort] = useState<AdminEmailSortKey>("updated");
  const [range, setRange] = useState<AdminEmailAnalyticsRange>("30d");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [historyEmail, setHistoryEmail] = useState<AdminManagedEmail | null>(
    null
  );
  const [recipients, setRecipients] = useState<AdminEmailRecipient[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    void refreshAnalytics(range);
  }, [range, refreshAnalytics, emails.length]);

  const filtered = useMemo(
    () =>
      sortAdminEmails(
        filterAdminEmails(emails, {
          query,
          status: statusFilter,
          audience: audienceFilter,
          trigger: triggerFilter,
        }),
        sort
      ),
    [emails, query, statusFilter, audienceFilter, triggerFilter, sort]
  );

  async function openHistory(email: AdminManagedEmail) {
    setHistoryEmail(email);
    setMenuId(null);
    setHistoryLoading(true);
    const rows = await loadRecipients(email.id);
    setRecipients(rows);
    setHistoryLoading(false);
  }

  function openCreate() {
    setNotice(null);
    setView("choose");
  }

  function startCreate(kind: AdminEmailKind) {
    setEditing(createAdminEmailDraft(kind));
    setView("editor");
  }

  function startEdit(email: AdminManagedEmail) {
    setNotice(null);
    setEditing(email);
    setView("editor");
    setMenuId(null);
  }

  async function handleSave(
    email: AdminManagedEmail,
    action: AdminEmailEditorAction
  ) {
    const saved = await save(email);
    setEditing(saved.email);
    if (action === "send_now") {
      if (!saved.ok) {
        setNotice(saved.message);
        return;
      }
      const count = await audienceCount(email.audienceIds);
      if (
        !window.confirm(
          `Send “${email.name || "Untitled"}” to ${count} recipient${count === 1 ? "" : "s"} now?`
        )
      ) {
        setNotice("Saved. Send canceled.");
        return;
      }
      setSending(true);
      const result = await sendNow(saved.email.id);
      setSending(false);
      setNotice(result.message);
      void refreshAnalytics(range);
      return;
    }
    if (action === "schedule") {
      setNotice(
        saved.ok
          ? "Scheduled. It will send automatically at the chosen time."
          : saved.message
      );
      return;
    }
    if (action === "activate") {
      setNotice(
        saved.ok
          ? "Active. It will send when the trigger fires."
          : saved.message
      );
      return;
    }
    setNotice(saved.ok ? "Saved." : saved.message);
  }

  async function handleDuplicate(email: AdminManagedEmail) {
    const copy = await duplicate(email);
    setMenuId(null);
    if (copy) startEdit(copy);
  }

  async function handleDelete(email: AdminManagedEmail) {
    if (!window.confirm(`Delete “${email.name || "Untitled"}”?`)) return;
    await remove(email.id);
    setMenuId(null);
  }

  async function handleResendNonOpeners(email?: AdminManagedEmail | null) {
    const target =
      email ?? historyEmail ?? emails.find((row) => row.sentCount > 0) ?? null;
    if (!target) {
      setNotice("Send an email first, then resend to people who did not open it.");
      return;
    }
    if (
      !window.confirm(
        `Resend “${target.name || "Untitled"}” to recipients who have not opened it?`
      )
    ) {
      return;
    }
    const result = await resendNonOpeners(target.id);
    setNotice(result.message);
    void refreshAnalytics(range);
    if (historyEmail?.id === target.id) {
      const rows = await loadRecipients(target.id);
      setRecipients(rows);
    }
  }

  if (view === "editor" && editing) {
    return (
      <AdminEmailEditor
        key={`${editing.id}:${editing.updatedAt}`}
        email={editing}
        notice={notice}
        sending={sending}
        onCancel={() => {
          setView("list");
          setEditing(null);
          setNotice(null);
          setSending(false);
        }}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="admin-email">
      <header className="admin-email-hero">
        <div className="admin-email-hero__copy">
          <p className="admin-email-hero__eyebrow">SMOAC · Admin email management</p>
          <h1 className="admin-email-hero__title">Build. Track. Control. Communicate.</h1>
          <p className="admin-email-hero__lede">
            Everything you need to manage automated and one-time emails for
            Specialists and Clients.
          </p>
        </div>
        <p className="admin-email-hero__callout">
          {live
            ? "Live sending, tracking, and automation are on."
            : "Live catalog is not connected yet. Apply the admin email tables, then keep this admin session signed in."}
        </p>
      </header>

      {notice ? <p className="admin-email-banner">{notice}</p> : null}

      {view === "choose" ? (
        <section className="admin-email-choose" aria-label="Create new email">
          <div className="admin-email-choose__head">
            <h2>Create new email</h2>
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--compact"
              onClick={() => setView("list")}
            >
              Cancel
            </button>
          </div>
          <div className="admin-email-choose__grid">
            <button
              type="button"
              className="admin-email-choose__card"
              onClick={() => startCreate("automated")}
            >
              <strong>Automated email</strong>
              <span>Fires from a trigger — sign up, incomplete profile, weekly, or custom.</span>
            </button>
            <button
              type="button"
              className="admin-email-choose__card"
              onClick={() => startCreate("one_time")}
            >
              <strong>One-time announcement</strong>
              <span>Write it, pick an audience, preview, then schedule or send now.</span>
            </button>
          </div>
        </section>
      ) : null}

      <section className="admin-email-analytics" aria-label="Analytics overview">
        <div className="admin-email-analytics__head">
          <h2>Analytics overview</h2>
          <label className="admin-email-range">
            <span className="sr-only">Date range</span>
            <select
              className="admin-field admin-field--select"
              value={range}
              onChange={(event) =>
                setRange(event.target.value as AdminEmailAnalyticsRange)
              }
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </label>
        </div>
        <div className="admin-email-kpis">
          <article className="admin-exec-card">
            <span className="admin-exec-card__label">Emails sent</span>
            <span className="admin-exec-card__stat">{analytics.emailsSent}</span>
            <span className="admin-exec-card__subtext">
              {range === "7d" ? "Last 7 days" : "Last 30 days"}
            </span>
          </article>
          <article className="admin-exec-card">
            <span className="admin-exec-card__label">Open rate</span>
            <span className="admin-exec-card__stat">
              {formatEmailPercent(analytics.openRate)}
            </span>
            <span className="admin-exec-card__subtext">From Resend open tracking</span>
          </article>
          <article className="admin-exec-card">
            <span className="admin-exec-card__label">Click rate</span>
            <span className="admin-exec-card__stat">
              {formatEmailPercent(analytics.clickRate)}
            </span>
            <span className="admin-exec-card__subtext">From Resend click tracking</span>
          </article>
          <article className="admin-exec-card">
            <span className="admin-exec-card__label">Unsubscribed</span>
            <span className="admin-exec-card__stat">
              {formatEmailPercent(analytics.unsubscribeRate)}
            </span>
            <span className="admin-exec-card__subtext">
              {analytics.bounceCount} bounce{analytics.bounceCount === 1 ? "" : "s"} ·{" "}
              {analytics.complaintCount} complaint
              {analytics.complaintCount === 1 ? "" : "s"}
            </span>
          </article>
        </div>
        <div className="admin-exec-chart-card admin-email-chart">
          <div className="admin-exec-chart-card__header">
            <h3 className="admin-email-chart__title">
              Email performance ({range === "7d" ? "Last 7 days" : "Last 30 days"})
            </h3>
            <ul className="admin-email-chart__legend">
              <li>
                <span className="admin-email-chart__swatch admin-email-chart__swatch--sent" />
                Sent
              </li>
              <li>
                <span className="admin-email-chart__swatch admin-email-chart__swatch--opened" />
                Opened
              </li>
              <li>
                <span className="admin-email-chart__swatch admin-email-chart__swatch--clicked" />
                Clicked
              </li>
            </ul>
          </div>
          <EmailPerformanceChart points={analytics.points} />
          <p className="admin-email-chart__empty">
            Chart fills in after emails start sending.
          </p>
        </div>
      </section>

      <section className="admin-email-list" aria-label="Email list">
        <div className="admin-email-list__head">
          <div>
            <h2>Email catalog</h2>
            <p>Automated and one-time emails. Empty until you add them.</p>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={openCreate}
          >
            + Create new email
          </button>
        </div>

        <div className="admin-email-filters">
          <label className="admin-email-search">
            <span className="sr-only">Search emails</span>
            <input
              className="admin-field"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, subject, trigger…"
            />
          </label>
          <select
            className="admin-field admin-field--select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as AdminEmailStatus | "all")
            }
            aria-label="Filter by status"
          >
            {ADMIN_EMAIL_STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="admin-field admin-field--select"
            value={audienceFilter}
            onChange={(event) =>
              setAudienceFilter(event.target.value as AdminEmailAudienceId | "all")
            }
            aria-label="Filter by audience"
          >
            <option value="all">All audiences</option>
            {ADMIN_EMAIL_AUDIENCE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="admin-field admin-field--select"
            value={triggerFilter}
            onChange={(event) =>
              setTriggerFilter(event.target.value as AdminEmailTriggerKind | "all")
            }
            aria-label="Filter by trigger"
          >
            <option value="all">All triggers</option>
            {ADMIN_EMAIL_TRIGGER_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="admin-field admin-field--select"
            value={sort}
            onChange={(event) => setSort(event.target.value as AdminEmailSortKey)}
            aria-label="Sort emails"
          >
            <option value="updated">Sort: recently updated</option>
            <option value="name">Sort: name</option>
            <option value="status">Sort: status</option>
            <option value="audience">Sort: audience</option>
            <option value="trigger">Sort: trigger</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="admin-empty">
            {emails.length === 0
              ? "No emails yet. Create an automated email or a one-time announcement."
              : "No emails match those filters."}
          </p>
        ) : (
          <>
            <div className="admin-table-wrap admin-desktop-only">
              <table className="admin-table admin-email-table">
                <thead>
                  <tr>
                    <th>Name / Subject</th>
                    <th>Trigger</th>
                    <th>Audience</th>
                    <th>Status</th>
                    <th>Last sent</th>
                    <th>Open rate</th>
                    <th>Click rate</th>
                    <th>Unsubscribed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((email) => (
                    <tr key={email.id}>
                      <td>
                        <strong>{email.name || "Untitled"}</strong>
                        <span className="admin-email-table__subject">
                          {email.subject || "No subject"}
                        </span>
                      </td>
                      <td>{email.triggerLabel}</td>
                      <td>{formatAudienceList(email.audienceIds)}</td>
                      <td>
                        <AdminStatusBadge label={email.status} />
                      </td>
                      <td>{formatEmailDate(email.lastSentAt)}</td>
                      <td>{formatEmailPercent(email.openRate)}</td>
                      <td>{formatEmailPercent(email.clickRate)}</td>
                      <td>{formatEmailPercent(email.unsubscribeRate)}</td>
                      <td>
                        <RowActions
                          email={email}
                          menuOpen={menuId === email.id}
                          onToggleMenu={() =>
                            setMenuId((id) => (id === email.id ? null : email.id))
                          }
                          onEdit={() => startEdit(email)}
                          onDuplicate={() => handleDuplicate(email)}
                          onDelete={() => handleDelete(email)}
                          onHistory={() => void openHistory(email)}
                          onStatus={(status) => {
                            setStatus(email.id, status);
                            setMenuId(null);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="admin-email-cards admin-mobile-only">
              {filtered.map((email) => (
                <li key={email.id} className="admin-email-card">
                  <div className="admin-email-card__top">
                    <div>
                      <strong>{email.name || "Untitled"}</strong>
                      <span>{email.subject || "No subject"}</span>
                    </div>
                    <AdminStatusBadge label={email.status} />
                  </div>
                  <p>
                    {email.triggerLabel} · {formatAudienceList(email.audienceIds)}
                  </p>
                  <div className="admin-email-card__actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--compact"
                      onClick={() => startEdit(email)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--compact admin-btn--ghost"
                      onClick={() => handleDuplicate(email)}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--compact admin-btn--ghost"
                      onClick={() => void openHistory(email)}
                    >
                      History
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--compact admin-btn--danger"
                      onClick={() => handleDelete(email)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="admin-email-tools" aria-label="Additional features">
        <h2>Additional tools</h2>
        <div className="admin-email-tools__grid">
          <button
            type="button"
            className="admin-email-tool"
            onClick={() => downloadAdminEmailsCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <strong>Export CSV</strong>
            <span>Download the current list.</span>
          </button>
          <button
            type="button"
            className="admin-email-tool"
            onClick={() => {
              const target = filtered[0] ?? emails[0] ?? null;
              if (target) void openHistory(target);
              else setNotice("Create an email first to view recipient history.");
            }}
          >
            <strong>Recipient history</strong>
            <span>Opens send logs for the selected email.</span>
          </button>
          <button
            type="button"
            className="admin-email-tool"
            onClick={() => void handleResendNonOpeners()}
          >
            <strong>Resend to non-openers</strong>
            <span>Sends again to people who have not opened yet.</span>
          </button>
          <div className="admin-email-tool admin-email-tool--static">
            <strong>Bounces & spam</strong>
            <span>
              {analytics.bounceCount} bounce{analytics.bounceCount === 1 ? "" : "s"} ·{" "}
              {analytics.complaintCount} complaint
              {analytics.complaintCount === 1 ? "" : "s"} in this range.
            </span>
          </div>
          <div className="admin-email-tool admin-email-tool--static">
            <strong>Template library</strong>
            <span>Editor uses the SMOAC transactional chrome.</span>
          </div>
          <div className="admin-email-tool admin-email-tool--static">
            <strong>Compliance</strong>
            <span>Unsubscribe is on by default in the editor.</span>
          </div>
        </div>
      </section>

      <aside className="admin-email-goal">
        <h2>Goal: full control, full visibility.</h2>
        <ul>
          <li>Know what emails are being sent</li>
          <li>Easily make changes</li>
          <li>Monitor performance</li>
          <li>Send announcements when needed</li>
          <li>Keep specialists and clients informed</li>
        </ul>
      </aside>

      <RecipientHistorySheet
        email={historyEmail}
        recipients={recipients}
        loading={historyLoading}
        onResend={() => void handleResendNonOpeners(historyEmail)}
        onClose={() => {
          setHistoryEmail(null);
          setRecipients([]);
        }}
      />
    </div>
  );
}

function RowActions({
  email,
  menuOpen,
  onToggleMenu,
  onEdit,
  onDuplicate,
  onDelete,
  onHistory,
  onStatus,
}: {
  email: AdminManagedEmail;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onHistory: () => void;
  onStatus: (status: AdminEmailStatus) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) onToggleMenu();
    }
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [menuOpen, onToggleMenu]);

  return (
    <div className="admin-email-row-actions" ref={menuRef}>
      <button
        type="button"
        className="admin-btn admin-btn--compact"
        onClick={onEdit}
      >
        Edit
      </button>
      <button
        type="button"
        className="admin-email-more"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`More actions for ${email.name || "untitled email"}`}
        onClick={onToggleMenu}
      >
        ⋮
      </button>
      {menuOpen ? (
        <div className="admin-email-menu" role="menu">
          {email.status === "active" ? (
            <button type="button" role="menuitem" onClick={() => onStatus("paused")}>
              Pause
            </button>
          ) : (
            <button type="button" role="menuitem" onClick={() => onStatus("active")}>
              Activate
            </button>
          )}
          <button type="button" role="menuitem" onClick={onDuplicate}>
            Duplicate
          </button>
          <button type="button" role="menuitem" onClick={onHistory}>
            Recipient history
          </button>
          <button
            type="button"
            role="menuitem"
            className="admin-email-menu__danger"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

function EmailPerformanceChart({
  points,
}: {
  points: Array<{ sent: number; opened: number; clicked: number }>;
}) {
  const width = 700;
  const height = 160;
  const max = Math.max(
    1,
    ...points.flatMap((point) => [point.sent, point.opened, point.clicked])
  );
  function path(key: "sent" | "opened" | "clicked"): string {
    return points
      .map((point, index) => {
        const x = (index / Math.max(points.length - 1, 1)) * width;
        const y = height - 16 - (point[key] / max) * (height - 28);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <svg
      className="admin-email-chart__svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Email performance chart"
    >
      <path d={path("sent")} fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
      <path d={path("opened")} fill="none" stroke="#7dd3fc" strokeWidth="2.5" />
      <path d={path("clicked")} fill="none" stroke="#2dd4bf" strokeWidth="2.5" />
    </svg>
  );
}

function RecipientHistorySheet({
  email,
  recipients,
  loading,
  onResend,
  onClose,
}: {
  email: AdminManagedEmail | null;
  recipients: AdminEmailRecipient[];
  loading: boolean;
  onResend: () => void;
  onClose: () => void;
}) {
  const open = email != null;
  useBlockingModalOpen(open);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="admin-email-sheet">
      <button
        type="button"
        className="admin-email-sheet__backdrop"
        aria-label="Close recipient history"
        onClick={onClose}
      />
      <div
        className="admin-email-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-email-history-title"
      >
        <div className="admin-email-sheet__head">
          <h2 id="admin-email-history-title">Recipient history</h2>
          <div className="admin-email-sheet__head-actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--compact"
              onClick={onResend}
            >
              Resend to non-openers
            </button>
            <button
              ref={closeRef}
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--compact"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
        <p className="admin-email-sheet__meta">
          {email.name || "Untitled"} · {email.subject || "No subject"}
        </p>
        {loading ? (
          <p className="admin-empty">Loading recipients…</p>
        ) : recipients.length === 0 ? (
          <p className="admin-empty">No recipient events yet. Send this email to see logs here.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Opened</th>
                  <th>Clicked</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.toName || row.toEmail}</strong>
                      {row.toName ? (
                        <span className="admin-email-table__subject">{row.toEmail}</span>
                      ) : null}
                    </td>
                    <td>
                      <AdminStatusBadge label={row.status} />
                    </td>
                    <td>{formatEmailDate(row.sentAt)}</td>
                    <td>{formatEmailDate(row.openedAt)}</td>
                    <td>{formatEmailDate(row.clickedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

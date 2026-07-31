"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import {
  deleteAdminManagedUser,
  fetchAdminManagedUsers,
  setAdminManagedUserActive,
  updateAdminManagedUserName,
} from "@/lib/admin-managed-users-service";
import { cn } from "@/lib/utils";
import type { AdminManagedUser } from "@/types/admin-managed-user";

type ClientStatusFilter = "all" | "active" | "deactivated";

interface AdminClientsPanelProps {
  /** Owner-only destructive actions (delete account) */
  canDelete: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function ClientCard({
  user,
  busy,
  canDelete,
  onSaveName,
  onToggleActive,
  onDelete,
}: {
  user: AdminManagedUser;
  busy: boolean;
  canDelete: boolean;
  onSaveName: (firstName: string, lastName: string) => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const nameDirty =
    firstName.trim() !== user.firstName || lastName.trim() !== user.lastName;

  return (
    <li className="admin-entity-card">
      <div className="admin-entity-card__head">
        <div>
          <h3 className="admin-entity-card__title">{user.displayName}</h3>
          <p className="admin-entity-card__sub">{user.email}</p>
        </div>
        <AdminStatusBadge label={user.status} />
      </div>

      <dl className="admin-entity-card__meta">
        <div>
          <dt>Saved specialists</dt>
          <dd>{user.savedSpecialistsCount}</dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </div>
        <div>
          <dt>Last active</dt>
          <dd>{formatDate(user.lastSignInAt)}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.emailConfirmed ? "Confirmed" : "Unconfirmed"}</dd>
        </div>
      </dl>

      <div className="admin-entity-card__actions admin-entity-card__actions--row">
        <button
          type="button"
          className="admin-btn smoac-control"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide details" : "Edit"}
        </button>
        <button
          type="button"
          className="admin-btn smoac-control"
          disabled={busy}
          onClick={onToggleActive}
        >
          {user.status === "active" ? "Deactivate" : "Reactivate"}
        </button>
        {canDelete ? (
          <button
            type="button"
            className="admin-btn smoac-control admin-btn--danger"
            disabled={busy}
            onClick={onDelete}
          >
            Delete
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="admin-entity-card__expand">
          <label className="admin-field-label">
            First name
            <input
              className="admin-field"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="admin-field-label">
            Last name
            <input
              className="admin-field"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="admin-btn smoac-control"
            disabled={busy || !nameDirty}
            onClick={() => onSaveName(firstName.trim(), lastName.trim())}
          >
            {busy ? "Saving…" : "Save name"}
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function AdminClientsPanel({ canDelete }: AdminClientsPanelProps) {
  const [users, setUsers] = useState<AdminManagedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>("all");
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminManagedUsers().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setUsers(result.users);
        setError(null);
      } else {
        setError(result.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const clients = useMemo(
    () => (users ?? []).filter((user) => user.role === "client"),
    [users]
  );

  const stats = useMemo(() => {
    const active = clients.filter((c) => c.status === "active").length;
    const deactivated = clients.filter((c) => c.status === "deactivated").length;
    const withSaves = clients.filter((c) => c.savedSpecialistsCount > 0).length;
    return {
      total: clients.length,
      active,
      deactivated,
      withSaves,
    };
  }, [clients]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((user) => {
      if (statusFilter === "active" && user.status !== "active") return false;
      if (statusFilter === "deactivated" && user.status !== "deactivated") {
        return false;
      }
      if (!query) return true;
      return (
        user.email.toLowerCase().includes(query) ||
        user.displayName.toLowerCase().includes(query)
      );
    });
  }, [clients, search, statusFilter]);

  async function runMutation(
    userId: string,
    mutate: () => Promise<{ ok: boolean; message?: string }>
  ) {
    setBusyIds((prev) => new Set(prev).add(userId));
    const result = await mutate();
    if (!result.ok) {
      setError(result.message ?? "Request failed.");
    } else {
      setError(null);
      setRefreshKey((key) => key + 1);
    }
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }

  function handleDelete(user: AdminManagedUser) {
    const confirmed = window.confirm(
      `Permanently delete ${user.email}? This removes their client account, profile, and saved specialists. This cannot be undone.`
    );
    if (!confirmed) return;
    void runMutation(user.userId, () => deleteAdminManagedUser(user.userId));
  }

  return (
    <DashboardSection
      title="Clients"
      description="Client accounts only — profiles, saves, and last activity."
    >
      <div
        className="admin-tier-nav admin-clients-summary"
        role="tablist"
        aria-label="Client status filters"
      >
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === "all"}
          className={cn(
            "admin-tier-card",
            statusFilter === "all" && "admin-tier-card--active"
          )}
          onClick={() => setStatusFilter("all")}
        >
          <span className="admin-tier-card__count">{stats.total}</span>
          <span className="admin-tier-card__label">Total clients</span>
          <span className="admin-tier-card__tier">All accounts</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === "active"}
          className={cn(
            "admin-tier-card",
            statusFilter === "active" && "admin-tier-card--active"
          )}
          onClick={() => setStatusFilter("active")}
        >
          <span className="admin-tier-card__count">{stats.active}</span>
          <span className="admin-tier-card__label">Active</span>
          <span className="admin-tier-card__tier">Can sign in</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === "deactivated"}
          className={cn(
            "admin-tier-card",
            statusFilter === "deactivated" && "admin-tier-card--active"
          )}
          onClick={() => setStatusFilter("deactivated")}
        >
          <span className="admin-tier-card__count">{stats.deactivated}</span>
          <span className="admin-tier-card__label">Deactivated</span>
          <span className="admin-tier-card__tier">Blocked</span>
        </button>
        <div className="admin-tier-card admin-tier-card--static" aria-hidden>
          <span className="admin-tier-card__count">{stats.withSaves}</span>
          <span className="admin-tier-card__label">With saves</span>
          <span className="admin-tier-card__tier">Saved ≥ 1 specialist</span>
        </div>
      </div>

      <p className="admin-tier-section__summary">
        <strong>
          {statusFilter === "all"
            ? "All clients"
            : statusFilter === "active"
              ? "Active clients"
              : "Deactivated clients"}
        </strong>
        <span className="admin-tier-section__summary-meta">
          {filtered.length} client{filtered.length === 1 ? "" : "s"}
        </span>
      </p>

      <div className="admin-entity-card__actions admin-entity-card__actions--row">
        <input
          className="admin-field"
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search clients"
        />
      </div>

      {error ? (
        <p className="admin-empty" role="alert">
          {error}
        </p>
      ) : null}

      {users === null && !error ? (
        <p className="admin-empty">Loading clients…</p>
      ) : null}

      {users !== null && filtered.length === 0 ? (
        <p className="admin-empty">
          {clients.length === 0
            ? "No client accounts yet."
            : "No clients match this filter."}
        </p>
      ) : null}

      <ul className="admin-card-list">
        {filtered.map((user) => (
          <ClientCard
            key={user.userId}
            user={user}
            busy={busyIds.has(user.userId)}
            canDelete={canDelete}
            onSaveName={(firstName, lastName) =>
              void runMutation(user.userId, () =>
                updateAdminManagedUserName(user.userId, firstName, lastName)
              )
            }
            onToggleActive={() =>
              void runMutation(user.userId, () =>
                setAdminManagedUserActive(
                  user.userId,
                  user.status !== "active"
                )
              )
            }
            onDelete={() => handleDelete(user)}
          />
        ))}
      </ul>
    </DashboardSection>
  );
}

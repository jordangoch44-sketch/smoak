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
import type { AdminManagedUser } from "@/types/admin-managed-user";

type RoleFilter = "all" | "client" | "specialist" | "none";

interface AdminClientsPanelProps {
  /** Owner-only destructive actions (delete account) */
  canDelete: boolean;
}

function roleLabel(role: AdminManagedUser["role"]): string {
  if (!role) return "no role";
  if (role === "owner_admin") return "owner admin";
  if (role === "staff_admin") return "staff admin";
  return role;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function UserCard({
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
  const isAdmin = user.role === "owner_admin" || user.role === "staff_admin";
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
          <dt>Role</dt>
          <dd>{roleLabel(user.role)}</dd>
        </div>
        <div>
          <dt>Saved</dt>
          <dd>{user.savedSpecialistsCount}</dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </div>
        <div>
          <dt>Last sign-in</dt>
          <dd>{formatDate(user.lastSignInAt)}</dd>
        </div>
      </dl>

      {!isAdmin ? (
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
      ) : (
        <p className="admin-entity-card__sub">Admin account — manage in Supabase.</p>
      )}

      {expanded && !isAdmin ? (
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
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
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

  const filtered = useMemo(() => {
    if (!users) return [];
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter === "client" && user.role !== "client") return false;
      if (roleFilter === "specialist" && user.role !== "specialist") return false;
      if (roleFilter === "none" && user.role !== null) return false;
      if (!query) return true;
      return (
        user.email.toLowerCase().includes(query) ||
        user.displayName.toLowerCase().includes(query)
      );
    });
  }, [users, search, roleFilter]);

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
      `Permanently delete ${user.email}? This removes their account, profile, and saved specialists. This cannot be undone.`
    );
    if (!confirmed) return;
    void runMutation(user.userId, () => deleteAdminManagedUser(user.userId));
  }

  return (
    <DashboardSection
      title="Users"
      description="Real platform accounts — search, edit, deactivate, or remove."
    >
      <div className="admin-entity-card__actions admin-entity-card__actions--row">
        <input
          className="admin-field"
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
        />
        <select
          className="admin-field admin-field--select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          <option value="client">Clients</option>
          <option value="specialist">Specialists</option>
          <option value="none">No role</option>
        </select>
      </div>

      {error ? (
        <p className="admin-empty" role="alert">
          {error}
        </p>
      ) : null}

      {users === null && !error ? (
        <p className="admin-empty">Loading accounts…</p>
      ) : null}

      {users !== null && filtered.length === 0 ? (
        <p className="admin-empty">No accounts match.</p>
      ) : null}

      <ul className="admin-card-list">
        {filtered.map((user) => (
          <UserCard
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

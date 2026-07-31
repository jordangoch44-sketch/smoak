"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard";

interface TeamMember {
  userId: string;
  role: "owner_admin" | "staff_admin";
  email: string;
  displayName: string;
  updatedAt: string | null;
  isYou: boolean;
}

export function AdminTeamPanel() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner_admin" | "staff_admin">("staff_admin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/team", { credentials: "include" });
      const body = (await res.json()) as {
        ok?: boolean;
        members?: TeamMember[];
        message?: string;
      };
      if (!res.ok || !body.ok) {
        setError(body.message ?? "Could not load admin team.");
        setMembers([]);
        return;
      }
      setMembers(body.members ?? []);
    } catch {
      setError("Could not load admin team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", email, role }),
      });
      const body = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !body.ok) {
        setError(body.message ?? "Invite failed.");
        return;
      }
      setMessage(`Invite sent to ${email}.`);
      setEmail("");
      await load();
    } catch {
      setError("Invite failed.");
    } finally {
      setBusy(false);
    }
  }

  async function setMemberRole(
    userId: string,
    nextRole: "owner_admin" | "staff_admin"
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_role", userId, role: nextRole }),
      });
      const body = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !body.ok) {
        setError(body.message ?? "Role update failed.");
        return;
      }
      await load();
    } catch {
      setError("Role update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(userId: string) {
    if (!window.confirm("Remove this person’s admin access?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", userId }),
      });
      const body = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !body.ok) {
        setError(body.message ?? "Revoke failed.");
        return;
      }
      await load();
    } catch {
      setError("Revoke failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardSection
      title="Admin users"
      description="Invite owners and staff. Access is stored in Supabase user_roles."
    >
      <div className="admin-team-invite">
        <label className="admin-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@smoac.com"
            autoComplete="off"
          />
        </label>
        <label className="admin-field">
          <span>Role</span>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "owner_admin" | "staff_admin")
            }
          >
            <option value="staff_admin">Staff</option>
            <option value="owner_admin">Owner</option>
          </select>
        </label>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={busy || !email.includes("@")}
          onClick={() => void invite()}
        >
          {busy ? "Sending…" : "Send invite"}
        </button>
      </div>

      {message ? <p className="admin-status-ok">{message}</p> : null}
      {error ? <p className="admin-status-error">{error}</p> : null}

      {loading ? (
        <p className="admin-empty">Loading team…</p>
      ) : members.length === 0 ? (
        <p className="admin-empty">No admin users found.</p>
      ) : (
        <ul className="admin-card-list">
          {members.map((member) => (
            <li key={member.userId} className="admin-card">
              <div className="admin-card__main">
                <p className="admin-card__title">
                  {member.displayName}
                  {member.isYou ? " (you)" : ""}
                </p>
                <p className="admin-card__meta">{member.email}</p>
                <p className="admin-card__meta">
                  {member.role === "owner_admin" ? "Owner" : "Staff"}
                </p>
              </div>
              {!member.isYou ? (
                <div className="admin-card__actions">
                  <select
                    aria-label={`Role for ${member.email}`}
                    value={member.role}
                    disabled={busy}
                    onChange={(e) =>
                      void setMemberRole(
                        member.userId,
                        e.target.value as "owner_admin" | "staff_admin"
                      )
                    }
                  >
                    <option value="staff_admin">Staff</option>
                    <option value="owner_admin">Owner</option>
                  </select>
                  <button
                    type="button"
                    className="admin-btn"
                    disabled={busy}
                    onClick={() => void revoke(member.userId)}
                  >
                    Revoke
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}

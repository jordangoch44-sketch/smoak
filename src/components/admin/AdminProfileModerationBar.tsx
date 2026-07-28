"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { purgeSpecialistFromMarketplace } from "@/lib/admin-specialist-purge-client";
import { hideApprovedSpecialistProfileAsync } from "@/lib/approved-specialist-profiles-store";
import { INTERNAL_DASHBOARD_PATH } from "@/lib/internal-routes";

interface AdminProfileModerationBarProps {
  specialistId: string;
  specialistName: string;
}

/**
 * Owner/staff chrome on public specialist profiles when signed in as admin.
 * Delete permanently removes the listing from the marketplace.
 */
export function AdminProfileModerationBar({
  specialistId,
  specialistName,
}: AdminProfileModerationBarProps) {
  const router = useRouter();
  const { session, isReady } = useAuthSession();
  const [busy, setBusy] = useState<"hide" | "delete" | null>(null);

  if (!isReady || !session || session.role !== "admin") {
    return null;
  }

  const isOwner = session.adminRole === "owner_admin";

  async function handleHide() {
    if (busy) return;
    setBusy("hide");
    const result = await hideApprovedSpecialistProfileAsync(specialistId);
    setBusy(null);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    window.alert("Profile hidden from the public catalog.");
    router.refresh();
  }

  async function handleDelete() {
    if (!isOwner || busy) return;
    const confirmed = window.confirm(
      `Permanently delete ${specialistName}? This removes their profile from the site, clears saves of them, and deletes their specialist login. This cannot be undone.`
    );
    if (!confirmed) return;
    setBusy("delete");
    const result = await purgeSpecialistFromMarketplace(specialistId);
    setBusy(null);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    router.replace(INTERNAL_DASHBOARD_PATH);
  }

  return (
    <div className="admin-profile-moderation" role="region" aria-label="Admin moderation">
      <p className="admin-profile-moderation__label">Admin</p>
      <div className="admin-profile-moderation__actions">
        <button
          type="button"
          className="admin-btn smoac-control"
          disabled={busy !== null}
          onClick={() => void handleHide()}
        >
          {busy === "hide" ? "Hiding…" : "Hide from site"}
        </button>
        {isOwner ? (
          <button
            type="button"
            className="admin-btn smoac-control admin-btn--danger"
            disabled={busy !== null}
            onClick={() => void handleDelete()}
          >
            {busy === "delete" ? "Deleting…" : "Delete permanently"}
          </button>
        ) : null}
        <a href={INTERNAL_DASHBOARD_PATH} className="admin-btn smoac-control">
          Open admin
        </a>
      </div>
    </div>
  );
}

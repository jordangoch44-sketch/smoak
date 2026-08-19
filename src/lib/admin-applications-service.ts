import { patchAdminSpecialistMeta } from "@/lib/admin-specialist-meta-store";
import { refreshAdminSpecialistDirectoryFromRemote } from "@/lib/admin-specialists-service";
import {
  purgeApprovedSpecialistProfileLocal,
  restoreApprovedSpecialistProfileAsync,
} from "@/lib/approved-specialist-profiles-store";
import { unhideTrainerId, hideTrainerId } from "@/lib/hidden-trainers-store";
import {
  syncApplicationProfileDraftAsync,
  syncProfileOverridesFromApplication,
} from "@/lib/managed-specialist-profile";
import {
  enrichSpecialistApplicationFields,
  normalizeSpecialistApplicationShape,
} from "@/lib/specialist-application-fields";
import {
  formatSpecialistGoLiveBlockMessage,
  getSpecialistGoLiveGaps,
} from "@/lib/specialist-go-live-gate";
import {
  deleteSiblingSpecialistApplicationsAsync,
  getSpecialistApplicationById,
  listSpecialistApplications,
  purgeSpecialistApplicationAccountAsync,
  refreshSpecialistApplicationsFromRemote,
  saveSpecialistApplicationAsync,
} from "@/lib/specialist-application-storage";
import type { AdminApplicationStatusLabel } from "@/types/admin";
import type {
  ProfileStatus,
  SpecialistApplication,
} from "@/types/specialist-application";

export type AdminApplicationMutationResult =
  | { ok: true; application: SpecialistApplication }
  | { ok: false; message: string; application?: SpecialistApplication };

function blockIfNotReadyToGoLive(
  application: SpecialistApplication
): AdminApplicationMutationResult | null {
  if (!application.userId?.trim()) {
    return {
      ok: false,
      message:
        "Cannot go live — this application has no linked auth account. Ask the specialist to sign in once, then retry.",
      application,
    };
  }
  const gaps = getSpecialistGoLiveGaps(application);
  if (gaps.length === 0) return null;
  return {
    ok: false,
    message: formatSpecialistGoLiveBlockMessage(gaps),
    application,
  };
}

export function applicationStatusLabel(
  status: ProfileStatus
): AdminApplicationStatusLabel {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "ARCHIVED") return "archived";
  return "pending";
}

function normalizeApplicationEdits(
  application: SpecialistApplication
): SpecialistApplication {
  const certifications = Array.isArray(application.certifications)
    ? application.certifications.filter(
        (cert) => cert?.name?.trim()
      )
    : [];
  const shaped = normalizeSpecialistApplicationShape({
    ...application,
    updatedAt: new Date().toISOString(),
    certifications,
  });
  const enriched = enrichSpecialistApplicationFields(
    shaped
  ) as SpecialistApplication;

  const oneOnOne = String(enriched.pricing.oneOnOnePrice ?? "").trim();
  const online = String(enriched.pricing.onlineCoachingPrice ?? "").trim();
  if (!oneOnOne && online) {
    return {
      ...enriched,
      pricing: {
        ...enriched.pricing,
        oneOnOnePrice: online,
      },
    };
  }

  return enriched;
}

/** Persist application edits and await remote application (+ catalog if approved). */
export async function saveSpecialistApplicationEditsAsync(
  application: SpecialistApplication
): Promise<AdminApplicationMutationResult> {
  const edited = normalizeApplicationEdits(application);
  const appResult = await saveSpecialistApplicationAsync(edited);
  if (!appResult.ok) {
    return { ok: false, message: appResult.message, application: edited };
  }

  /* Use the saved copy — inline photos may have moved to storage URLs. */
  const updated = appResult.application;
  syncProfileOverridesFromApplication(updated);

  if (updated.profileStatus === "APPROVED") {
    const catalog = await syncApplicationProfileDraftAsync(updated);
    if (!catalog.ok) {
      return { ok: false, message: catalog.message, application: updated };
    }
  }

  return { ok: true, application: updated };
}

/** Approve application + await specialist_profiles upsert + refresh catalog. */
export async function approveSpecialistApplicationWithEditsAsync(
  application: SpecialistApplication
): Promise<AdminApplicationMutationResult> {
  const blocked = blockIfNotReadyToGoLive(application);
  if (blocked) return blocked;
  return saveSpecialistApplicationEditsAsync({
    ...application,
    profileStatus: "APPROVED",
    rejectionReason: "",
  });
}

export async function rejectSpecialistApplicationWithEditsAsync(
  application: SpecialistApplication
): Promise<AdminApplicationMutationResult> {
  const reason = application.rejectionReason?.trim() ?? "";
  if (reason.length < 8) {
    return {
      ok: false,
      message:
        "Add a rejection reason (short note for the specialist, 8+ characters).",
      application,
    };
  }

  /*
   * Full deny: hard-delete application(s), catalog profile, and Auth user
   * so the email is free for a new signup.
   */
  const purged = await purgeSpecialistApplicationAccountAsync(application);
  if (!purged.ok) {
    return { ok: false, message: purged.message, application };
  }
  for (const id of purged.deletedIds) {
    purgeApprovedSpecialistProfileLocal(id);
    hideTrainerId(id);
  }
  void refreshAdminSpecialistDirectoryFromRemote();
  refreshSpecialistApplicationsFromRemote();

  try {
    const { sendSpecialistApplicationRejectedEmail } = await import(
      "@/lib/email/confirmation-email-service"
    );
    void sendSpecialistApplicationRejectedEmail({
      ...application,
      profileStatus: "REJECTED",
      rejectionReason: reason,
    }).then((result) => {
      if (!result.success) {
        console.warn("[SMOAC EMAIL] Rejection email did not send", {
          applicationId: application.id,
        });
      }
    });
  } catch (err) {
    console.warn("[SMOAC EMAIL] Rejection email dispatch skipped:", err);
  }

  return {
    ok: true,
    application: {
      ...application,
      profileStatus: "REJECTED",
      rejectionReason: reason,
    },
  };
}

/** Specialist requests another review after fixing a rejected application. */
export async function resubmitSpecialistApplicationForReviewAsync(
  applicationId: string
): Promise<AdminApplicationMutationResult> {
  const existing = getSpecialistApplicationById(applicationId);
  if (!existing) {
    return { ok: false, message: "Application not found." };
  }
  if (existing.profileStatus !== "REJECTED") {
    return {
      ok: false,
      message: "Only rejected applications can request another review.",
      application: existing,
    };
  }

  const pendingEdits = normalizeApplicationEdits({
    ...existing,
    profileStatus: "PENDING_APPROVAL",
    rejectionReason: "",
    submittedAt: existing.submittedAt ?? new Date().toISOString(),
  });
  const appResult = await saveSpecialistApplicationAsync(pendingEdits);
  if (!appResult.ok) {
    return { ok: false, message: appResult.message, application: pendingEdits };
  }

  const pending = appResult.application;
  syncProfileOverridesFromApplication(pending);
  hideTrainerId(pending.id);
  return { ok: true, application: pending };
}

export async function archiveSpecialistApplicationAsync(
  application: SpecialistApplication
): Promise<AdminApplicationMutationResult> {
  const purged = await purgeSpecialistApplicationAccountAsync(application);
  if (!purged.ok) {
    return { ok: false, message: purged.message, application };
  }
  for (const id of purged.deletedIds) {
    purgeApprovedSpecialistProfileLocal(id);
    hideTrainerId(id);
  }
  void refreshAdminSpecialistDirectoryFromRemote();
  refreshSpecialistApplicationsFromRemote();

  return {
    ok: true,
    application: {
      ...application,
      profileStatus: "ARCHIVED",
    },
  };
}

/**
 * Approve (if needed) + await catalog upsert as approved + clear hide.
 * Public Explore visibility is specialist_profiles.status = approved.
 * Prefer passing the saved application object so a concurrent remote
 * hydrate cannot drop fields (e.g. session price) before publish.
 */
export async function activateSpecialistFromApplicationAsync(
  applicationOrId: string | SpecialistApplication
): Promise<AdminApplicationMutationResult> {
  const existing =
    typeof applicationOrId === "string"
      ? getSpecialistApplicationById(applicationOrId)
      : applicationOrId;
  if (!existing) {
    return { ok: false, message: "Application not found." };
  }

  const blocked = blockIfNotReadyToGoLive(existing);
  if (blocked) return blocked;

  const approvedEdits = normalizeApplicationEdits({
    ...existing,
    profileStatus: "APPROVED",
    rejectionReason: "",
  });

  const appResult = await saveSpecialistApplicationAsync(approvedEdits);
  if (!appResult.ok) {
    return { ok: false, message: appResult.message, application: approvedEdits };
  }

  const approved = appResult.application;
  const catalog = await syncApplicationProfileDraftAsync(approved);
  if (!catalog.ok) {
    return { ok: false, message: catalog.message, application: approved };
  }

  /* Ensure status is approved even if row was previously hidden */
  const restored = await restoreApprovedSpecialistProfileAsync(approved.id);
  if (!restored.ok) {
    return { ok: false, message: restored.message, application: approved };
  }

  unhideTrainerId(approved.id);
  patchAdminSpecialistMeta(approved.id, { visibility: "active" });

  /* Drop duplicate applications for the same email/user so Specialists stays 1:1. */
  const siblings = await deleteSiblingSpecialistApplicationsAsync(approved);
  if (!siblings.ok) {
    console.warn(
      "[SMOAC admin] sibling application cleanup failed:",
      siblings.message
    );
  }

  /* Go live → one-time 30-day Pro trial (idempotent; skips if already used). */
  const userId = approved.userId?.trim() || "";
  if (userId && typeof window !== "undefined") {
    try {
      const trialRes = await fetch(
        "/api/admin/specialists/grant-premium-trial",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userId,
            specialistId: approved.id,
          }),
        }
      );
      const trialPayload = (await trialRes.json().catch(() => null)) as {
        ok?: boolean;
        granted?: boolean;
        message?: string;
      } | null;
      if (!trialRes.ok || !trialPayload?.ok) {
        console.warn(
          "[SMOAC admin] Pro trial grant on activate failed:",
          trialPayload?.message || trialRes.status
        );
      }
    } catch (err) {
      console.warn("[SMOAC admin] Pro trial grant on activate skipped:", err);
    }
  }

  try {
    const { sendSpecialistApplicationApprovedEmail } = await import(
      "@/lib/email/confirmation-email-service"
    );
    void sendSpecialistApplicationApprovedEmail(approved).then((result) => {
      if (!result.success) {
        console.warn("[SMOAC EMAIL] Approval email did not send", {
          applicationId: approved.id,
        });
      }
    });
  } catch (err) {
    console.warn("[SMOAC EMAIL] Approval email dispatch skipped:", err);
  }

  return { ok: true, application: approved };
}

/**
 * Activate from a reviewed draft (saves edits first, then activates).
 * Reuses activateSpecialistFromApplicationAsync so Pro trial + email always run.
 */
export async function activateSpecialistApplicationWithEditsAsync(
  application: SpecialistApplication
): Promise<AdminApplicationMutationResult> {
  const blocked = blockIfNotReadyToGoLive(application);
  if (blocked) return blocked;

  const saved = await saveSpecialistApplicationEditsAsync({
    ...application,
    profileStatus: "APPROVED",
    rejectionReason: "",
  });
  if (!saved.ok) return saved;

  return activateSpecialistFromApplicationAsync(saved.application);
}

export function listApplicationsByStatus(
  label: AdminApplicationStatusLabel | "all"
): readonly SpecialistApplication[] {
  const all = listSpecialistApplications();
  if (label === "all") return all;
  return all.filter((app) => applicationStatusLabel(app.profileStatus) === label);
}

export function countPendingApplications(): number {
  return listApplicationsByStatus("pending").length;
}

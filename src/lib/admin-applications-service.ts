import { patchAdminSpecialistMeta } from "@/lib/admin-specialist-meta-store";
import {
  removeApprovedSpecialistProfileAsync,
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
  getSpecialistApplicationById,
  listSpecialistApplications,
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
        (cert) => cert?.name?.trim() && cert?.issuer?.trim()
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

  const rejectedEdits = normalizeApplicationEdits({
    ...application,
    profileStatus: "REJECTED",
    rejectionReason: reason,
  });
  const appResult = await saveSpecialistApplicationAsync(rejectedEdits);
  if (!appResult.ok) {
    return { ok: false, message: appResult.message, application: rejectedEdits };
  }
  const rejected = appResult.application;
  syncProfileOverridesFromApplication(rejected);
  const removed = await removeApprovedSpecialistProfileAsync(rejected.id);
  if (!removed.ok) {
    return { ok: false, message: removed.message, application: rejected };
  }
  hideTrainerId(rejected.id);

  try {
    const { sendSpecialistApplicationRejectedEmail } = await import(
      "@/lib/email/confirmation-email-service"
    );
    void sendSpecialistApplicationRejectedEmail(rejected).then((result) => {
      if (!result.success) {
        console.warn("[SMOAC EMAIL] Rejection email did not send", {
          applicationId: rejected.id,
        });
      }
    });
  } catch (err) {
    console.warn("[SMOAC EMAIL] Rejection email dispatch skipped:", err);
  }

  return { ok: true, application: rejected };
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
  const archivedEdits = normalizeApplicationEdits({
    ...application,
    profileStatus: "ARCHIVED",
  });
  const appResult = await saveSpecialistApplicationAsync(archivedEdits);
  if (!appResult.ok) {
    return { ok: false, message: appResult.message, application: archivedEdits };
  }
  const archived = appResult.application;
  syncProfileOverridesFromApplication(archived);
  const removed = await removeApprovedSpecialistProfileAsync(archived.id);
  if (!removed.ok) {
    return { ok: false, message: removed.message, application: archived };
  }
  hideTrainerId(archived.id);
  return { ok: true, application: archived };
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

  /* Pro trial is opt-in from Plan & upgrade (one-time) — not auto-granted on approve. */

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

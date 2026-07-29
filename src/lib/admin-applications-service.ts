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
  return {
    ...application,
    updatedAt: new Date().toISOString(),
    certifications: application.certifications.filter(
      (cert) => cert.name.trim() && cert.issuer.trim()
    ),
  };
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
  return saveSpecialistApplicationEditsAsync({
    ...application,
    profileStatus: "APPROVED",
  });
}

export async function rejectSpecialistApplicationWithEditsAsync(
  application: SpecialistApplication
): Promise<AdminApplicationMutationResult> {
  const rejectedEdits = normalizeApplicationEdits({
    ...application,
    profileStatus: "REJECTED",
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
  return { ok: true, application: rejected };
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
 */
export async function activateSpecialistFromApplicationAsync(
  id: string
): Promise<AdminApplicationMutationResult> {
  const existing = getSpecialistApplicationById(id);
  if (!existing) {
    return { ok: false, message: "Application not found." };
  }

  const approvedEdits = normalizeApplicationEdits({
    ...existing,
    profileStatus: "APPROVED",
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
  const restored = await restoreApprovedSpecialistProfileAsync(id);
  if (!restored.ok) {
    return { ok: false, message: restored.message, application: approved };
  }

  unhideTrainerId(id);
  patchAdminSpecialistMeta(id, { visibility: "active" });

  /* Ensure activated specialists get the signup Pro trial if not already granted */
  if (approved.userId) {
    try {
      const { createSupabaseServiceClient } = await import(
        "@/lib/supabase/service"
      );
      const { grantSpecialistPremiumTrialIfNeeded } = await import(
        "@/lib/specialist-premium-trial"
      );
      const service = createSupabaseServiceClient();
      if (service) {
        await grantSpecialistPremiumTrialIfNeeded(
          service,
          approved.userId,
          id
        );
      }
    } catch (err) {
      console.warn("[SMOAC trial] activate grant skipped:", err);
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
 */
export async function activateSpecialistApplicationWithEditsAsync(
  application: SpecialistApplication
): Promise<AdminApplicationMutationResult> {
  const saved = await saveSpecialistApplicationEditsAsync({
    ...application,
    profileStatus: "APPROVED",
  });
  if (!saved.ok) return saved;

  const restored = await restoreApprovedSpecialistProfileAsync(saved.application.id);
  if (!restored.ok) {
    return {
      ok: false,
      message: restored.message,
      application: saved.application,
    };
  }

  unhideTrainerId(saved.application.id);
  patchAdminSpecialistMeta(saved.application.id, { visibility: "active" });

  try {
    const { sendSpecialistApplicationApprovedEmail } = await import(
      "@/lib/email/confirmation-email-service"
    );
    void sendSpecialistApplicationApprovedEmail(saved.application).then(
      (result) => {
        if (!result.success) {
          console.warn("[SMOAC EMAIL] Approval email did not send", {
            applicationId: saved.application.id,
          });
        }
      }
    );
  } catch (err) {
    console.warn("[SMOAC EMAIL] Approval email dispatch skipped:", err);
  }

  return saved;
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

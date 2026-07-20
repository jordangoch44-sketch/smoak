import { patchAdminSpecialistMeta } from "@/lib/admin-specialist-meta-store";
import {
  hideApprovedSpecialistProfileAsync,
  removeApprovedSpecialistProfileAsync,
  restoreApprovedSpecialistProfileAsync,
} from "@/lib/approved-specialist-profiles-store";
import { unhideTrainerId, hideTrainerId } from "@/lib/hidden-trainers-store";
import {
  syncApplicationProfileDraft,
  syncApplicationProfileDraftAsync,
  syncApprovedProfileFromApplication,
  syncProfileOverridesFromApplication,
} from "@/lib/managed-specialist-profile";
import {
  getSpecialistApplicationById,
  listSpecialistApplications,
  saveSpecialistApplication,
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

/** @deprecated Prefer saveSpecialistApplicationEditsAsync — fire-and-forget remote. */
export function saveSpecialistApplicationEdits(
  application: SpecialistApplication
): SpecialistApplication {
  const updated = normalizeApplicationEdits(application);
  saveSpecialistApplication(updated);
  syncProfileOverridesFromApplication(updated);
  if (updated.profileStatus === "APPROVED") {
    syncApprovedProfileFromApplication(updated);
  }
  return updated;
}

/** Persist application edits and await remote application (+ catalog if approved). */
export async function saveSpecialistApplicationEditsAsync(
  application: SpecialistApplication
): Promise<AdminApplicationMutationResult> {
  const updated = normalizeApplicationEdits(application);
  const appResult = await saveSpecialistApplicationAsync(updated);
  if (!appResult.ok) {
    return { ok: false, message: appResult.message, application: updated };
  }

  syncProfileOverridesFromApplication(updated);

  if (updated.profileStatus === "APPROVED") {
    const catalog = await syncApplicationProfileDraftAsync(updated);
    if (!catalog.ok) {
      return { ok: false, message: catalog.message, application: updated };
    }
  }

  return { ok: true, application: updated };
}

/** @deprecated Prefer updateApplicationStatusAsync */
export function updateApplicationStatus(
  id: string,
  profileStatus: ProfileStatus
): SpecialistApplication | null {
  const existing = getSpecialistApplicationById(id);
  if (!existing) return null;
  const updated: SpecialistApplication = {
    ...existing,
    profileStatus,
    updatedAt: new Date().toISOString(),
  };
  saveSpecialistApplication(updated);
  if (profileStatus === "APPROVED") {
    syncApplicationProfileDraft(updated);
  } else if (profileStatus === "REJECTED" || profileStatus === "ARCHIVED") {
    void removeApprovedSpecialistProfileAsync(id);
  }
  return updated;
}

export async function updateApplicationStatusAsync(
  id: string,
  profileStatus: ProfileStatus
): Promise<AdminApplicationMutationResult> {
  const existing = getSpecialistApplicationById(id);
  if (!existing) {
    return { ok: false, message: "Application not found." };
  }

  const updated: SpecialistApplication = {
    ...existing,
    profileStatus,
    updatedAt: new Date().toISOString(),
  };

  const appResult = await saveSpecialistApplicationAsync(updated);
  if (!appResult.ok) {
    return { ok: false, message: appResult.message, application: updated };
  }

  if (profileStatus === "APPROVED") {
    const catalog = await syncApplicationProfileDraftAsync(updated);
    if (!catalog.ok) {
      return { ok: false, message: catalog.message, application: updated };
    }
    unhideTrainerId(id);
  } else if (profileStatus === "REJECTED" || profileStatus === "ARCHIVED") {
    const removed = await removeApprovedSpecialistProfileAsync(id);
    if (!removed.ok) {
      return { ok: false, message: removed.message, application: updated };
    }
    hideTrainerId(id);
  }

  return { ok: true, application: updated };
}

/** @deprecated Prefer approveSpecialistApplicationWithEditsAsync */
export function approveSpecialistApplication(
  id: string
): SpecialistApplication | null {
  return updateApplicationStatus(id, "APPROVED");
}

/** @deprecated Prefer approveSpecialistApplicationWithEditsAsync */
export function approveSpecialistApplicationWithEdits(
  application: SpecialistApplication
): SpecialistApplication {
  const approved = saveSpecialistApplicationEdits({
    ...application,
    profileStatus: "APPROVED",
    updatedAt: new Date().toISOString(),
  });
  syncApplicationProfileDraft(approved);
  return approved;
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

/** @deprecated Prefer rejectSpecialistApplicationWithEditsAsync */
export function rejectSpecialistApplication(
  id: string
): SpecialistApplication | null {
  return updateApplicationStatus(id, "REJECTED");
}

/** @deprecated Prefer rejectSpecialistApplicationWithEditsAsync */
export function rejectSpecialistApplicationWithEdits(
  application: SpecialistApplication
): SpecialistApplication {
  const rejected = saveSpecialistApplicationEdits({
    ...application,
    profileStatus: "REJECTED",
    updatedAt: new Date().toISOString(),
  });
  void removeApprovedSpecialistProfileAsync(rejected.id);
  return rejected;
}

export async function rejectSpecialistApplicationWithEditsAsync(
  application: SpecialistApplication
): Promise<AdminApplicationMutationResult> {
  const rejected = normalizeApplicationEdits({
    ...application,
    profileStatus: "REJECTED",
  });
  const appResult = await saveSpecialistApplicationAsync(rejected);
  if (!appResult.ok) {
    return { ok: false, message: appResult.message, application: rejected };
  }
  syncProfileOverridesFromApplication(rejected);
  const removed = await removeApprovedSpecialistProfileAsync(rejected.id);
  if (!removed.ok) {
    return { ok: false, message: removed.message, application: rejected };
  }
  hideTrainerId(rejected.id);
  return { ok: true, application: rejected };
}

/** @deprecated Prefer archiveSpecialistApplicationAsync */
export function archiveSpecialistApplication(
  application: SpecialistApplication
): SpecialistApplication {
  const archived = saveSpecialistApplicationEdits({
    ...application,
    profileStatus: "ARCHIVED",
    updatedAt: new Date().toISOString(),
  });
  void removeApprovedSpecialistProfileAsync(archived.id);
  return archived;
}

export async function archiveSpecialistApplicationAsync(
  application: SpecialistApplication
): Promise<AdminApplicationMutationResult> {
  const archived = normalizeApplicationEdits({
    ...application,
    profileStatus: "ARCHIVED",
  });
  const appResult = await saveSpecialistApplicationAsync(archived);
  if (!appResult.ok) {
    return { ok: false, message: appResult.message, application: archived };
  }
  syncProfileOverridesFromApplication(archived);
  const removed = await removeApprovedSpecialistProfileAsync(archived.id);
  if (!removed.ok) {
    return { ok: false, message: removed.message, application: archived };
  }
  hideTrainerId(archived.id);
  return { ok: true, application: archived };
}

/** @deprecated Prefer activateSpecialistFromApplicationAsync */
export function activateSpecialistFromApplication(
  id: string
): SpecialistApplication | null {
  const existing = getSpecialistApplicationById(id);
  if (!existing) return null;

  const approved =
    existing.profileStatus === "APPROVED"
      ? existing
      : approveSpecialistApplication(id);
  if (!approved) return null;

  syncApplicationProfileDraft(approved);
  unhideTrainerId(id);
  patchAdminSpecialistMeta(id, { visibility: "active" });
  return approved;
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

  const approved = normalizeApplicationEdits({
    ...existing,
    profileStatus: "APPROVED",
  });

  const appResult = await saveSpecialistApplicationAsync(approved);
  if (!appResult.ok) {
    return { ok: false, message: appResult.message, application: approved };
  }

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

/** Hide from public catalog via specialist_profiles.status (durable). */
export async function hideSpecialistFromPublicCatalogAsync(
  trainerId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await hideApprovedSpecialistProfileAsync(trainerId);
  if (!result.ok) return result;
  hideTrainerId(trainerId);
  patchAdminSpecialistMeta(trainerId, { visibility: "hidden" });
  return { ok: true };
}

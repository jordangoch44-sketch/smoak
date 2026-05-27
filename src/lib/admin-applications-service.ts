import { applicationToProfileOverrides } from "@/lib/admin-application-profile";
import {
  getSpecialistApplicationById,
  listSpecialistApplications,
  saveSpecialistApplication,
} from "@/lib/specialist-application-storage";
import { saveSpecialistOverridesForId } from "@/lib/specialist-profile-overrides";
import { patchAdminSpecialistMeta } from "@/lib/admin-specialist-meta-store";
import { unhideTrainerId } from "@/lib/hidden-trainers-store";
import type { AdminApplicationStatusLabel } from "@/types/admin";
import type {
  ProfileStatus,
  SpecialistApplication,
} from "@/types/specialist-application";

export function applicationStatusLabel(
  status: ProfileStatus
): AdminApplicationStatusLabel {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

function syncApplicationProfileDraft(app: SpecialistApplication): void {
  saveSpecialistOverridesForId(app.id, applicationToProfileOverrides(app));
}

export function saveSpecialistApplicationEdits(
  application: SpecialistApplication
): SpecialistApplication {
  const updated: SpecialistApplication = {
    ...application,
    updatedAt: new Date().toISOString(),
    certifications: application.certifications.filter(
      (cert) => cert.name.trim() && cert.issuer.trim()
    ),
  };
  saveSpecialistApplication(updated);
  syncApplicationProfileDraft(updated);
  return updated;
}

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
  }
  return updated;
}

export function approveSpecialistApplication(
  id: string
): SpecialistApplication | null {
  return updateApplicationStatus(id, "APPROVED");
}

/** Persist draft fields then mark approved (single write for mobile review actions) */
export function approveSpecialistApplicationWithEdits(
  application: SpecialistApplication
): SpecialistApplication {
  return saveSpecialistApplicationEdits({
    ...application,
    profileStatus: "APPROVED",
    updatedAt: new Date().toISOString(),
  });
}

export function rejectSpecialistApplication(
  id: string
): SpecialistApplication | null {
  return updateApplicationStatus(id, "REJECTED");
}

export function rejectSpecialistApplicationWithEdits(
  application: SpecialistApplication
): SpecialistApplication {
  return saveSpecialistApplicationEdits({
    ...application,
    profileStatus: "REJECTED",
    updatedAt: new Date().toISOString(),
  });
}

/** Approve + mark specialist active in admin meta (profile override draft already exists from onboarding) */
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

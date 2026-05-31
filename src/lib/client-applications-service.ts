import {
  getClientApplicationById,
  listClientApplications,
  saveClientApplication,
} from "@/lib/client-application-storage";
import type { AdminApplicationStatusLabel } from "@/types/admin";
import type {
  ClientApplication,
  ClientApplicationStatus,
} from "@/types/client-application";

export function clientApplicationStatusLabel(
  status: ClientApplicationStatus
): AdminApplicationStatusLabel {
  if (status === "ACTIVE") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "ARCHIVED") return "archived";
  return "pending";
}

export function saveClientApplicationEdits(
  application: ClientApplication
): ClientApplication {
  const updated: ClientApplication = {
    ...application,
    updatedAt: new Date().toISOString(),
  };
  saveClientApplication(updated);
  return updated;
}

export function updateClientApplicationStatus(
  id: string,
  status: ClientApplicationStatus
): ClientApplication | null {
  const existing = getClientApplicationById(id);
  if (!existing) return null;
  const updated: ClientApplication = {
    ...existing,
    status,
    updatedAt: new Date().toISOString(),
  };
  saveClientApplication(updated);
  return updated;
}

export function approveClientApplication(
  application: ClientApplication
): ClientApplication {
  return saveClientApplicationEdits({
    ...application,
    status: "ACTIVE",
    updatedAt: new Date().toISOString(),
  });
}

export function rejectClientApplication(
  application: ClientApplication
): ClientApplication {
  return saveClientApplicationEdits({
    ...application,
    status: "REJECTED",
    updatedAt: new Date().toISOString(),
  });
}

export function archiveClientApplication(
  application: ClientApplication
): ClientApplication {
  return saveClientApplicationEdits({
    ...application,
    status: "ARCHIVED",
    updatedAt: new Date().toISOString(),
  });
}

export function listClientApplicationsByStatus(
  label: AdminApplicationStatusLabel | "all"
): readonly ClientApplication[] {
  const all = listClientApplications();
  if (label === "all") return all;
  return all.filter((app) => clientApplicationStatusLabel(app.status) === label);
}

export function countPendingClientApplications(): number {
  return listClientApplicationsByStatus("pending").length;
}

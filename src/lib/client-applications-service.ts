import {
  getClientApplicationById,
  listClientApplications,
  saveClientApplicationAsync,
} from "@/lib/client-application-storage";
import type { AdminApplicationStatusLabel } from "@/types/admin";
import type {
  ClientApplication,
  ClientApplicationStatus,
} from "@/types/client-application";

export type ClientApplicationMutationResult =
  | { ok: true; application: ClientApplication }
  | { ok: false; message: string; application?: ClientApplication };

export function clientApplicationStatusLabel(
  status: ClientApplicationStatus
): AdminApplicationStatusLabel {
  if (status === "ACTIVE") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "ARCHIVED") return "archived";
  return "pending";
}

export async function saveClientApplicationEdits(
  application: ClientApplication
): Promise<ClientApplicationMutationResult> {
  const updated: ClientApplication = {
    ...application,
    updatedAt: new Date().toISOString(),
  };
  const result = await saveClientApplicationAsync(updated);
  if (!result.ok) {
    return { ok: false, message: result.message, application: updated };
  }
  return { ok: true, application: result.application };
}

export async function updateClientApplicationStatus(
  id: string,
  status: ClientApplicationStatus
): Promise<ClientApplicationMutationResult> {
  const existing = getClientApplicationById(id);
  if (!existing) {
    return { ok: false, message: "Client application not found." };
  }
  return saveClientApplicationEdits({
    ...existing,
    status,
  });
}

export async function approveClientApplication(
  application: ClientApplication
): Promise<ClientApplicationMutationResult> {
  return saveClientApplicationEdits({
    ...application,
    status: "ACTIVE",
  });
}

export async function rejectClientApplication(
  application: ClientApplication
): Promise<ClientApplicationMutationResult> {
  return saveClientApplicationEdits({
    ...application,
    status: "REJECTED",
  });
}

export async function archiveClientApplication(
  application: ClientApplication
): Promise<ClientApplicationMutationResult> {
  return saveClientApplicationEdits({
    ...application,
    status: "ARCHIVED",
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

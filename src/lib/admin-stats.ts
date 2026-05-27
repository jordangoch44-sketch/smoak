import { trainers } from "@/data/trainers";
import { DEV_SPECIALIST_CREDENTIALS } from "@/lib/dev-auth";
import { getHiddenTrainersSnapshot } from "@/lib/hidden-trainers-store";
import { countPendingApplications } from "@/lib/admin-applications-service";
import { getAdminSpecialistMetaSnapshot } from "@/lib/admin-specialist-meta-store";
import { listSpecialistApplications } from "@/lib/specialist-application-storage";
import type { AdminOverviewStats, AdminSpecialistVisibility } from "@/types/admin";
import type { AdminClientRecord } from "@/types/admin";

function resolveVisibility(
  trainerId: string,
  hiddenIds: readonly string[]
): AdminSpecialistVisibility {
  const meta = getAdminSpecialistMetaSnapshot()[trainerId];
  if (meta?.visibility) return meta.visibility;
  if (hiddenIds.includes(trainerId)) return "hidden";
  const app = listSpecialistApplications().find((a) => a.id === trainerId);
  if (app?.profileStatus === "PENDING_APPROVAL") return "pending";
  return "active";
}

export function computeAdminOverviewStats(
  clients: AdminClientRecord[]
): AdminOverviewStats {
  const hiddenIds = getHiddenTrainersSnapshot();
  const meta = getAdminSpecialistMetaSnapshot();
  const applicationIds = new Set(
    listSpecialistApplications().map((a) => a.id)
  );

  const catalogIds = new Set(trainers.map((t) => t.id));
  applicationIds.forEach((id) => catalogIds.add(id));

  let activeSpecialists = 0;
  let premiumSpecialists = 0;

  for (const id of catalogIds) {
    const visibility = resolveVisibility(id, hiddenIds);
    if (visibility === "active") activeSpecialists += 1;
    const row = meta[id];
    const seed = trainers.find((t) => t.id === id);
    const isPremium =
      row?.isPremium === true ||
      (id === "anthony-brooks" && DEV_SPECIALIST_CREDENTIALS.isPremium === true) ||
      seed?.featured === true;
    if (isPremium) premiumSpecialists += 1;
  }

  return {
    totalSpecialists: catalogIds.size,
    pendingApplications: countPendingApplications(),
    activeSpecialists,
    premiumSpecialists,
    totalClients: clients.length,
    savedSpecialistActivityPlaceholder: "Coming soon — aggregate saves & engagement",
  };
}

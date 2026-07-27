import { countPendingApplications } from "@/lib/admin-applications-service";
import { listAdminSpecialists } from "@/lib/admin-specialists-service";
import { countPendingClientApplications } from "@/lib/client-applications-service";
import type { AdminOverviewStats } from "@/types/admin";
import type { AdminClientRecord } from "@/types/admin";
import type { SpecialistApplication } from "@/types/specialist-application";

export function computeAdminOverviewStats(
  clients: AdminClientRecord[],
  _specialistApplications: readonly SpecialistApplication[] = [],
  _clientApplications: readonly { status: string }[] = []
): AdminOverviewStats {
  const specialists = listAdminSpecialists();
  const activeSpecialists = specialists.filter(
    (row) => row.visibility === "active"
  ).length;
  const premiumSpecialists = specialists.filter((row) => row.isPremium).length;
  const totalSavedSpecialists = clients.reduce(
    (sum, client) => sum + (client.savedSpecialistsCount || 0),
    0
  );

  return {
    totalSpecialists: specialists.length,
    pendingApplications:
      countPendingApplications() + countPendingClientApplications(),
    activeSpecialists,
    premiumSpecialists,
    totalClients: clients.length,
    totalSavedSpecialists,
  };
}

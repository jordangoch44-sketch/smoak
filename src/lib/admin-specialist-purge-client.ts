import { purgeAdminSpecialist } from "@/lib/admin-specialist-purge-service";
import { purgeApprovedSpecialistProfileLocal } from "@/lib/approved-specialist-profiles-store";
import { refreshAdminSpecialistDirectoryFromRemote } from "@/lib/admin-specialists-service";
import { refreshSpecialistApplicationsFromRemote } from "@/lib/specialist-application-storage";

/** Hard-delete specialist from marketplace + refresh admin/client caches. */
export async function purgeSpecialistFromMarketplace(
  specialistId: string,
  options?: { deleteAuthUser?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await purgeAdminSpecialist(specialistId, options);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message ?? "Could not delete specialist.",
    };
  }

  purgeApprovedSpecialistProfileLocal(specialistId);
  void refreshAdminSpecialistDirectoryFromRemote();
  refreshSpecialistApplicationsFromRemote();

  return { ok: true };
}

import { ADMIN_APPLICATIONS_SEED } from "@/data/admin-applications-seed";
import { removeSpecialistApplicationLocal } from "@/lib/specialist-application-storage";

const SEED_MERGED_KEY = "smoac_admin_applications_seed_v1";
const SEED_PURGED_KEY = "smoac_admin_applications_seed_purged_v1";

/**
 * Control is live-only: never inject demo applications, and drop leftover
 * local seed IDs from older admin sessions.
 */
export function ensureAdminApplicationSeeds(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(SEED_PURGED_KEY) === "1") return;
  } catch {
    return;
  }

  for (const seed of ADMIN_APPLICATIONS_SEED) {
    removeSpecialistApplicationLocal(seed.id);
  }

  try {
    window.localStorage.setItem(SEED_PURGED_KEY, "1");
    window.localStorage.removeItem(SEED_MERGED_KEY);
  } catch {
    /* ignore */
  }
}

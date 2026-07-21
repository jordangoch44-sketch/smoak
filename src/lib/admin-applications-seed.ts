import { ADMIN_APPLICATIONS_SEED } from "@/data/admin-applications-seed";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import {
  listSpecialistApplications,
  saveSpecialistApplication,
} from "@/lib/specialist-application-storage";

const SEED_MERGED_KEY = "smoac_admin_applications_seed_v1";

/** DEV — inject sample join-flow applications once per browser */
export function ensureAdminApplicationSeeds(): void {
  if (typeof window === "undefined") return;
  /* Live mode: saveSpecialistApplication pushes to Supabase — demo seeds
   * must never enter the production applications table. */
  if (isMarketplaceSupabaseActive()) return;
  try {
    if (window.localStorage.getItem(SEED_MERGED_KEY) === "1") {
      return;
    }
  } catch {
    return;
  }

  const existing = listSpecialistApplications();
  const existingIds = new Set(existing.map((app) => app.id));

  for (const seed of ADMIN_APPLICATIONS_SEED) {
    if (!existingIds.has(seed.id)) {
      saveSpecialistApplication(seed);
    }
  }

  try {
    window.localStorage.setItem(SEED_MERGED_KEY, "1");
  } catch {
    /* ignore */
  }
}

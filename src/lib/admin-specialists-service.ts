import { trainers } from "@/data/trainers";
import {
  getAdminSpecialistMeta,
  patchAdminSpecialistMeta,
} from "@/lib/admin-specialist-meta-store";
import {
  getApprovedSpecialistProfileById,
  hideApprovedSpecialistProfileAsync,
  refreshApprovedSpecialistProfilesFromRemoteAsync,
  restoreApprovedSpecialistProfileAsync,
} from "@/lib/approved-specialist-profiles-store";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import { setSpecialistProfileFlags } from "@/lib/profiles/specialist-profiles-db";
import {
  getHiddenTrainersSnapshot,
  hideTrainerId,
  unhideTrainerId,
} from "@/lib/hidden-trainers-store";
import {
  applySpecialistProfileOverrides,
  loadAllSpecialistOverrides,
} from "@/lib/specialist-profile-overrides";
import { saveTrainerProfileOverrides } from "@/lib/specialist-profile-store";
import { parseTravelRadiusMiles } from "@/lib/specialist-service-area";
import { listSpecialistApplications } from "@/lib/specialist-application-storage";
import type { AdminSpecialistVisibility } from "@/types/admin";
import type { Trainer } from "@/types/trainer";

export interface AdminSpecialistRow {
  id: string;
  name: string;
  profession: string;
  specialty: string[];
  city: string;
  state: string;
  neighborhood: string;
  zipCode: string;
  serviceType: string;
  travelRadius: string;
  visibility: AdminSpecialistVisibility;
  featured: boolean;
  sponsored: boolean;
  topRanked: boolean;
  isPremium: boolean;
  isProtected: boolean;
  accountKind: "real" | "test";
  inSeedCatalog: boolean;
  profileHref: string;
}

function mergeTrainerBase(base: Trainer, id: string): Trainer {
  return applySpecialistProfileOverrides(base, loadAllSpecialistOverrides()[id]);
}

function applicationAsTrainerRow(
  id: string,
  visibility: AdminSpecialistVisibility
): AdminSpecialistRow | null {
  const app = listSpecialistApplications().find((a) => a.id === id);
  if (!app) return null;
  const meta = getAdminSpecialistMeta(id);
  /* Durable placement flags live on specialist_profiles — prefer remote truth */
  const approved = getApprovedSpecialistProfileById(id);
  return {
    id,
    name: app.displayName.trim() || app.fullName.trim() || id,
    profession: app.professionalType || "Specialist",
    specialty: app.specialties,
    city: app.city,
    state: app.state ?? "",
    neighborhood: app.neighborhood,
    zipCode: app.zipCode,
    serviceType: app.serviceType,
    travelRadius: app.travelRadius,
    visibility,
    featured: approved?.featured ?? meta.featured ?? false,
    sponsored: approved?.sponsored ?? meta.sponsored ?? false,
    topRanked: meta.topRanked ?? false,
    isPremium: meta.isPremium ?? false,
    isProtected: meta.isProtected ?? false,
    accountKind: meta.accountKind ?? "test",
    inSeedCatalog: false,
    profileHref: `/trainers/${id}`,
  };
}

function resolveVisibility(
  trainerId: string,
  hiddenIds: readonly string[]
): AdminSpecialistVisibility {
  const meta = getAdminSpecialistMeta(trainerId);
  if (meta?.visibility) return meta.visibility;
  if (hiddenIds.includes(trainerId)) return "hidden";
  const app = listSpecialistApplications().find((a) => a.id === trainerId);
  if (app?.profileStatus === "PENDING_APPROVAL") return "pending";
  return "active";
}

export function listAdminSpecialists(): AdminSpecialistRow[] {
  const hiddenIds = getHiddenTrainersSnapshot();
  const ids = new Set<string>(trainers.map((t) => t.id));
  listSpecialistApplications().forEach((a) => ids.add(a.id));

  const rows: AdminSpecialistRow[] = [];

  for (const id of ids) {
    const visibility = resolveVisibility(id, hiddenIds);
    const meta = getAdminSpecialistMeta(id);
    const seed = trainers.find((t) => t.id === id);

    if (seed) {
      const merged = mergeTrainerBase(seed, id);
      const approved = getApprovedSpecialistProfileById(id);
      rows.push({
        id,
        name: merged.name,
        profession: meta.profession ?? merged.profession,
        specialty: meta.specialty ?? merged.specialty,
        city: meta.city ?? merged.city,
        state: meta.state ?? merged.state ?? "",
        neighborhood: meta.neighborhood ?? merged.neighborhood,
        zipCode: meta.zipCode ?? merged.zipCode ?? "",
        serviceType: meta.serviceType ?? merged.serviceType ?? "",
        travelRadius: meta.travelRadius ?? merged.travelRadius ?? "",
        visibility,
        featured: approved?.featured ?? meta.featured ?? merged.featured,
        sponsored: approved?.sponsored ?? meta.sponsored ?? Boolean(merged.sponsored),
        topRanked: meta.topRanked ?? false,
        isPremium: meta.isPremium ?? merged.featured,
        isProtected: meta.isProtected ?? false,
        accountKind: meta.accountKind ?? "test",
        inSeedCatalog: true,
        profileHref: `/trainers/${id}`,
      });
    } else {
      const fromApp = applicationAsTrainerRow(id, visibility);
      if (fromApp) rows.push(fromApp);
    }
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Public visibility is specialist_profiles.status (approved vs hidden).
 * Local hidden set + admin meta mirror for the admin UI on this device.
 */
export async function setAdminSpecialistVisibilityAsync(
  trainerId: string,
  visibility: AdminSpecialistVisibility
): Promise<{ ok: true } | { ok: false; message: string }> {
  patchAdminSpecialistMeta(trainerId, { visibility });

  if (visibility === "hidden" || visibility === "suspended") {
    const result = await hideApprovedSpecialistProfileAsync(trainerId);
    if (!result.ok) return result;
    hideTrainerId(trainerId);
    return { ok: true };
  }

  if (visibility === "active") {
    const result = await restoreApprovedSpecialistProfileAsync(trainerId);
    if (!result.ok) return result;
    unhideTrainerId(trainerId);
    return { ok: true };
  }

  /* pending — keep off Explore via local hide until activated */
  hideTrainerId(trainerId);
  return { ok: true };
}

export function setAdminSpecialistProtected(
  trainerId: string,
  isProtected: boolean
): void {
  patchAdminSpecialistMeta(trainerId, {
    isProtected,
    ...(isProtected ? { accountKind: "real" as const } : {}),
  });
}

export function setAdminSpecialistAccountKind(
  trainerId: string,
  accountKind: "real" | "test"
): void {
  patchAdminSpecialistMeta(trainerId, {
    accountKind,
    ...(accountKind === "real" ? { isProtected: true } : {}),
  });
}

export type AdminSpecialistFlag =
  | "featured"
  | "sponsored"
  | "topRanked"
  | "isPremium";

/**
 * featured / sponsored are durable `specialist_profiles` columns (live home
 * rails read them). topRanked / isPremium have no DB column yet — local meta
 * only. Local meta mirror keeps the admin UI responsive in both cases.
 */
export async function setAdminSpecialistFlagAsync(
  trainerId: string,
  flag: AdminSpecialistFlag,
  value: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  patchAdminSpecialistMeta(trainerId, { [flag]: value });

  if (flag !== "featured" && flag !== "sponsored") return { ok: true };
  if (!isMarketplaceSupabaseActive()) return { ok: true };

  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  const result = await setSpecialistProfileFlags(supabase, trainerId, {
    [flag]: value,
  });
  if (!result.ok) {
    console.warn(
      "[SMOAC admin] specialist_profiles flag update failed:",
      result.message
    );
    return result;
  }

  await refreshApprovedSpecialistProfilesFromRemoteAsync();
  return { ok: true };
}

export function updateAdminSpecialistBasics(
  trainerId: string,
  basics: {
    profession?: string;
    specialty?: string[];
    city?: string;
    state?: string;
    neighborhood?: string;
    zipCode?: string;
    serviceType?: "in-person" | "virtual" | "both";
    travelRadius?: string;
  }
): void {
  patchAdminSpecialistMeta(trainerId, basics);

  const existing = loadAllSpecialistOverrides()[trainerId] ?? {};
  const travelRadius = basics.travelRadius ?? existing.travelRadius;
  saveTrainerProfileOverrides(trainerId, {
    ...existing,
    ...(basics.profession != null ? { profession: basics.profession } : {}),
    ...(basics.specialty != null ? { specialty: basics.specialty } : {}),
    ...(basics.city != null ? { city: basics.city } : {}),
    ...(basics.state != null ? { state: basics.state } : {}),
    ...(basics.neighborhood != null ? { neighborhood: basics.neighborhood } : {}),
    ...(basics.zipCode != null ? { zipCode: basics.zipCode } : {}),
    ...(basics.serviceType != null ? { serviceType: basics.serviceType } : {}),
    ...(travelRadius != null
      ? {
          travelRadius,
          serviceRadiusMiles: parseTravelRadiusMiles(travelRadius) || undefined,
        }
      : {}),
  });
}

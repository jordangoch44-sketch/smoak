import { trainers } from "@/data/trainers";
import {
  getAdminSpecialistMeta,
  patchAdminSpecialistMeta,
} from "@/lib/admin-specialist-meta-store";
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
  topRanked: boolean;
  isPremium: boolean;
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
    featured: meta.featured ?? false,
    topRanked: meta.topRanked ?? false,
    isPremium: meta.isPremium ?? false,
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
        featured: meta.featured ?? merged.featured,
        topRanked: meta.topRanked ?? false,
        isPremium: meta.isPremium ?? merged.featured,
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

export function setAdminSpecialistVisibility(
  trainerId: string,
  visibility: AdminSpecialistVisibility
): void {
  patchAdminSpecialistMeta(trainerId, { visibility });
  if (visibility === "hidden") {
    hideTrainerId(trainerId);
  } else if (visibility === "active") {
    unhideTrainerId(trainerId);
  }
}

export function setAdminSpecialistFlag(
  trainerId: string,
  flag: "featured" | "topRanked" | "isPremium",
  value: boolean
): void {
  patchAdminSpecialistMeta(trainerId, { [flag]: value });
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

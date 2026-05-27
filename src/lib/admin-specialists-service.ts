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
import { loadAllSpecialistOverrides } from "@/lib/specialist-profile-overrides";
import { listSpecialistApplications } from "@/lib/specialist-application-storage";
import type { AdminSpecialistVisibility } from "@/types/admin";
import type { Trainer } from "@/types/trainer";

export interface AdminSpecialistRow {
  id: string;
  name: string;
  profession: string;
  specialty: string[];
  city: string;
  neighborhood: string;
  visibility: AdminSpecialistVisibility;
  featured: boolean;
  topRanked: boolean;
  isPremium: boolean;
  inSeedCatalog: boolean;
  profileHref: string;
}

function mergeTrainerBase(base: Trainer, id: string): Trainer {
  const overrides = loadAllSpecialistOverrides()[id];
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    specialty: overrides.specialty ?? base.specialty,
    serviceArea: overrides.serviceArea ?? base.serviceArea,
  };
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
    neighborhood: app.neighborhood,
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
        neighborhood: meta.neighborhood ?? merged.neighborhood,
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
    neighborhood?: string;
  }
): void {
  patchAdminSpecialistMeta(trainerId, basics);
}

import { trainers } from "@/data/trainers";
import {
  getAdminSpecialistMeta,
  getAdminSpecialistMetaSnapshot,
  patchAdminSpecialistMeta,
} from "@/lib/admin-specialist-meta-store";
import {
  getApprovedSpecialistProfileById,
  getApprovedSpecialistProfilesSnapshot,
  hideApprovedSpecialistProfileAsync,
  refreshApprovedSpecialistProfilesFromRemoteAsync,
  restoreApprovedSpecialistProfileAsync,
} from "@/lib/approved-specialist-profiles-store";
import {
  getMarketplaceAuthClient,
  isMarketplaceSupabaseActive,
} from "@/lib/auth/marketplace-auth";
import {
  fetchAdminSpecialistDirectory,
  setSpecialistProfileFlags,
  setSpecialistProfileOpsFields,
  updateSpecialistProfileBasics,
  type AdminSpecialistDirectoryEntry,
} from "@/lib/profiles/specialist-profiles-db";
import {
  getHiddenTrainersSnapshot,
  hideTrainerId,
  unhideTrainerId,
} from "@/lib/hidden-trainers-store";
import { isLivePublicCatalogMode } from "@/lib/public-catalog-mode";
import {
  applySpecialistProfileOverrides,
  loadAllSpecialistOverrides,
} from "@/lib/specialist-profile-overrides";
import { saveTrainerProfileOverrides } from "@/lib/specialist-profile-store";
import { parseTravelRadiusMiles } from "@/lib/specialist-service-area";
import {
  getSpecialistApplicationById,
  listSpecialistApplications,
} from "@/lib/specialist-application-storage";
import type { AdminSpecialistVisibility } from "@/types/admin";
import type { Trainer } from "@/types/trainer";

export interface AdminSpecialistRow {
  id: string;
  name: string;
  /** Login / application email when known. */
  email: string;
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
  /** Complimentary 30-day Pro trial started (ISO). */
  premiumTrialStartedAt?: string | null;
  premiumTrialEndsAt?: string | null;
  premiumTrialActive?: boolean;
  premiumTrialDaysRemaining?: number | null;
  /** Paid Stripe Pro / Platinum (active or Stripe-trialing). */
  isPaidPro?: boolean;
}

const EMPTY_DIRECTORY: Record<string, AdminSpecialistDirectoryEntry> =
  Object.freeze({});
const directoryListeners = new Set<() => void>();
let directoryById: Record<string, AdminSpecialistDirectoryEntry> =
  EMPTY_DIRECTORY;

function directorySignature(
  map: Record<string, AdminSpecialistDirectoryEntry>
): string {
  return Object.keys(map)
    .sort()
    .map(
      (id) =>
        `${id}:${map[id]?.status}:${map[id]?.trainer.name}:${map[id]?.trainer.featured}:${map[id]?.email ?? ""}`
    )
    .join("|");
}

function resolveSpecialistEmail(
  id: string,
  directoryEmail?: string | null
): string {
  const fromDirectory = directoryEmail?.trim().toLowerCase();
  if (fromDirectory) return fromDirectory;
  const app =
    getSpecialistApplicationById(id) ??
    listSpecialistApplications().find((item) => item.id === id);
  return app?.email?.trim().toLowerCase() ?? "";
}

function emitDirectory(
  next: Record<string, AdminSpecialistDirectoryEntry>
): void {
  const normalized =
    Object.keys(next).length > 0 ? { ...next } : EMPTY_DIRECTORY;
  if (directorySignature(normalized) === directorySignature(directoryById)) {
    return;
  }
  directoryById = normalized;
  directoryListeners.forEach((listener) => listener());
}

export function subscribeAdminSpecialistDirectory(
  onStoreChange: () => void
): () => void {
  directoryListeners.add(onStoreChange);
  return () => directoryListeners.delete(onStoreChange);
}

export function getAdminSpecialistDirectorySnapshot(): Record<
  string,
  AdminSpecialistDirectoryEntry
> {
  return directoryById;
}

export function getAdminSpecialistDirectoryServerSnapshot(): Record<
  string,
  AdminSpecialistDirectoryEntry
> {
  return EMPTY_DIRECTORY;
}

/** Replace in-memory admin roster from specialist_profiles (all statuses). */
export function setAdminSpecialistDirectoryFromRemote(
  entries: AdminSpecialistDirectoryEntry[]
): void {
  const next: Record<string, AdminSpecialistDirectoryEntry> = {};
  for (const entry of entries) {
    next[entry.trainer.id] = entry;
  }
  emitDirectory(next);
}

/** Load full admin directory when the signed-in user has admin RLS. */
export async function refreshAdminSpecialistDirectoryFromRemote(): Promise<void> {
  if (!isMarketplaceSupabaseActive()) {
    emitDirectory({});
    return;
  }
  const supabase = getMarketplaceAuthClient();
  if (!supabase) return;
  const result = await fetchAdminSpecialistDirectory(supabase);
  if (!result.ok) return;
  setAdminSpecialistDirectoryFromRemote(result.entries);
}

function mergeTrainerBase(base: Trainer, id: string): Trainer {
  return applySpecialistProfileOverrides(base, loadAllSpecialistOverrides()[id]);
}

function statusToVisibility(
  status: string | undefined
): AdminSpecialistVisibility | null {
  if (status === "approved") return "active";
  if (status === "hidden") return "hidden";
  if (status === "archived") return "hidden";
  return null;
}

function applicationAsTrainerRow(
  id: string,
  visibility: AdminSpecialistVisibility
): AdminSpecialistRow | null {
  const app = listSpecialistApplications().find((a) => a.id === id);
  if (!app) return null;
  const meta = getAdminSpecialistMeta(id);
  const approved = getApprovedSpecialistProfileById(id);
  const directory = directoryById[id]?.trainer;
  return {
    id,
    name: app.displayName.trim() || app.fullName.trim() || id,
    email: resolveSpecialistEmail(id, directoryById[id]?.email ?? app.email),
    profession: app.professionalType || "Specialist",
    specialty: app.specialties,
    city: app.city,
    state: app.state ?? "",
    neighborhood: app.neighborhood,
    zipCode: app.zipCode,
    serviceType: app.serviceType,
    travelRadius: app.travelRadius,
    visibility,
    featured: approved?.featured ?? directory?.featured ?? meta.featured ?? false,
    sponsored:
      approved?.sponsored ?? directory?.sponsored ?? meta.sponsored ?? false,
    topRanked:
      approved?.topRanked ?? directory?.topRanked ?? meta.topRanked ?? false,
    isPremium:
      approved?.isPremium ?? directory?.isPremium ?? meta.isPremium ?? false,
    isProtected: meta.isProtected ?? false,
    accountKind: meta.accountKind ?? "test",
    inSeedCatalog: false,
    profileHref: `/trainers/${id}`,
  };
}

function rowFromTrainer(
  trainer: Trainer,
  visibility: AdminSpecialistVisibility,
  inSeedCatalog: boolean,
  directoryEmail?: string | null
): AdminSpecialistRow {
  const meta = getAdminSpecialistMeta(trainer.id);
  return {
    id: trainer.id,
    name: trainer.name,
    email: resolveSpecialistEmail(trainer.id, directoryEmail),
    profession: meta.profession ?? trainer.profession,
    specialty: meta.specialty ?? trainer.specialty,
    city: meta.city ?? trainer.city,
    state: meta.state ?? trainer.state ?? "",
    neighborhood: meta.neighborhood ?? trainer.neighborhood,
    zipCode: meta.zipCode ?? trainer.zipCode ?? "",
    serviceType: meta.serviceType ?? trainer.serviceType ?? "",
    travelRadius: meta.travelRadius ?? trainer.travelRadius ?? "",
    visibility,
    featured: trainer.featured ?? meta.featured ?? false,
    sponsored: Boolean(trainer.sponsored) || Boolean(meta.sponsored),
    topRanked: Boolean(trainer.topRanked) || Boolean(meta.topRanked),
    isPremium: Boolean(trainer.isPremium) || Boolean(meta.isPremium),
    isProtected: meta.isProtected ?? false,
    accountKind: meta.accountKind ?? (inSeedCatalog ? "test" : "real"),
    inSeedCatalog,
    profileHref: `/trainers/${trainer.id}`,
  };
}

function resolveVisibility(
  trainerId: string,
  hiddenIds: readonly string[]
): AdminSpecialistVisibility {
  const fromStatus = statusToVisibility(directoryById[trainerId]?.status);
  if (fromStatus) return fromStatus;

  const meta = getAdminSpecialistMeta(trainerId);
  if (meta?.visibility) return meta.visibility;
  if (hiddenIds.includes(trainerId)) return "hidden";
  const app = listSpecialistApplications().find((a) => a.id === trainerId);
  if (app?.profileStatus === "PENDING_APPROVAL") return "pending";
  return "active";
}

function usesLiveAdminRoster(): boolean {
  return isLivePublicCatalogMode() || isMarketplaceSupabaseActive();
}

/**
 * Admin specialists table.
 * Live: specialist_profiles directory + pending applications (never seed).
 * Seed mode: demo trainers + local applications.
 */
export function listAdminSpecialists(): AdminSpecialistRow[] {
  const hiddenIds = getHiddenTrainersSnapshot();
  const rows: AdminSpecialistRow[] = [];
  const seen = new Set<string>();

  if (usesLiveAdminRoster()) {
    for (const [id, entry] of Object.entries(directoryById)) {
      seen.add(id);
      const visibility = resolveVisibility(id, hiddenIds);
      const approved = getApprovedSpecialistProfileById(id);
      rows.push(
        rowFromTrainer(
          approved ?? entry.trainer,
          visibility,
          false,
          entry.email
        )
      );
    }

    /* Approved cache may be ahead of directory briefly after approve */
    for (const [id, trainer] of Object.entries(
      getApprovedSpecialistProfilesSnapshot()
    )) {
      if (seen.has(id)) continue;
      seen.add(id);
      rows.push(
        rowFromTrainer(
          trainer,
          resolveVisibility(id, hiddenIds),
          false,
          directoryById[id]?.email
        )
      );
    }

    for (const app of listSpecialistApplications()) {
      /* Only pending apps appear here — approved live as profiles; rejected/archived are gone. */
      if (app.profileStatus !== "PENDING_APPROVAL") continue;
      if (seen.has(app.id)) continue;
      seen.add(app.id);
      const visibility = resolveVisibility(app.id, hiddenIds);
      const fromApp = applicationAsTrainerRow(app.id, visibility);
      if (fromApp) rows.push(fromApp);
    }

    /* Meta-only stubs (ops flags) without a profile row yet */
    for (const id of Object.keys(getAdminSpecialistMetaSnapshot())) {
      if (seen.has(id)) continue;
      const fromApp = applicationAsTrainerRow(
        id,
        resolveVisibility(id, hiddenIds)
      );
      if (fromApp) {
        seen.add(id);
        rows.push(fromApp);
      }
    }

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  const ids = new Set<string>(trainers.map((t) => t.id));
  listSpecialistApplications().forEach((a) => ids.add(a.id));

  for (const id of ids) {
    const visibility = resolveVisibility(id, hiddenIds);
    const seed = trainers.find((t) => t.id === id);

    if (seed) {
      const merged = mergeTrainerBase(seed, id);
      const approved = getApprovedSpecialistProfileById(id);
      rows.push(
        rowFromTrainer(
          {
            ...merged,
            featured: approved?.featured ?? merged.featured,
            sponsored: approved?.sponsored ?? merged.sponsored,
            topRanked: approved?.topRanked ?? false,
            isPremium: approved?.isPremium ?? false,
          },
          visibility,
          true,
          directoryById[id]?.email
        )
      );
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
    await refreshAdminSpecialistDirectoryFromRemote();
    return { ok: true };
  }

  if (visibility === "active") {
    const result = await restoreApprovedSpecialistProfileAsync(trainerId);
    if (!result.ok) return result;
    unhideTrainerId(trainerId);
    await refreshAdminSpecialistDirectoryFromRemote();
    return { ok: true };
  }

  /* pending — keep off Explore via local hide until activated */
  hideTrainerId(trainerId);
  return { ok: true };
}

export async function setAdminSpecialistProtectedAsync(
  trainerId: string,
  isProtected: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  patchAdminSpecialistMeta(trainerId, {
    isProtected,
    ...(isProtected ? { accountKind: "real" as const } : {}),
  });

  if (!isMarketplaceSupabaseActive()) return { ok: true };
  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }
  const result = await setSpecialistProfileOpsFields(supabase, trainerId, {
    isProtected,
    ...(isProtected ? { accountKind: "real" as const } : {}),
  });
  if (!result.ok) return result;
  await refreshAdminSpecialistDirectoryFromRemote();
  return { ok: true };
}

export async function setAdminSpecialistAccountKindAsync(
  trainerId: string,
  accountKind: "real" | "test"
): Promise<{ ok: true } | { ok: false; message: string }> {
  patchAdminSpecialistMeta(trainerId, {
    accountKind,
    ...(accountKind === "real" ? { isProtected: true } : {}),
  });

  if (!isMarketplaceSupabaseActive()) return { ok: true };
  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }
  const result = await setSpecialistProfileOpsFields(supabase, trainerId, {
    accountKind,
    ...(accountKind === "real" ? { isProtected: true } : {}),
  });
  if (!result.ok) return result;
  await refreshAdminSpecialistDirectoryFromRemote();
  return { ok: true };
}

/** @deprecated Prefer setAdminSpecialistProtectedAsync */
export function setAdminSpecialistProtected(
  trainerId: string,
  isProtected: boolean
): void {
  void setAdminSpecialistProtectedAsync(trainerId, isProtected);
}

/** @deprecated Prefer setAdminSpecialistAccountKindAsync */
export function setAdminSpecialistAccountKind(
  trainerId: string,
  accountKind: "real" | "test"
): void {
  void setAdminSpecialistAccountKindAsync(trainerId, accountKind);
}

export type AdminSpecialistFlag =
  | "featured"
  | "sponsored"
  | "topRanked"
  | "isPremium";

/**
 * featured / sponsored / topRanked / isPremium are durable specialist_profiles
 * columns. Local meta mirror keeps the admin UI responsive. isPremium also
 * mirrors onto user_roles when the profile has a linked user_id.
 */
export async function setAdminSpecialistFlagAsync(
  trainerId: string,
  flag: AdminSpecialistFlag,
  value: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  patchAdminSpecialistMeta(trainerId, { [flag]: value });

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

  if (flag === "isPremium") {
    const userId =
      getSpecialistApplicationById(trainerId)?.userId?.trim() || null;
    if (userId) {
      const { error } = await supabase
        .from("user_roles")
        .update({ is_premium: value, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) {
        console.warn(
          "[SMOAC admin] user_roles is_premium update failed:",
          error.message
        );
      }
    }
  }

  await refreshApprovedSpecialistProfilesFromRemoteAsync();
  await refreshAdminSpecialistDirectoryFromRemote();
  return { ok: true };
}

export async function updateAdminSpecialistBasicsAsync(
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
): Promise<{ ok: true } | { ok: false; message: string }> {
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

  if (!isMarketplaceSupabaseActive()) return { ok: true };
  const supabase = getMarketplaceAuthClient();
  if (!supabase) {
    return { ok: false, message: "Authentication is not available." };
  }

  const result = await updateSpecialistProfileBasics(supabase, trainerId, {
    profession: basics.profession,
    specialty: basics.specialty,
    city: basics.city,
    state: basics.state,
    neighborhood: basics.neighborhood,
    zipCode: basics.zipCode,
    serviceType: basics.serviceType,
  });
  if (!result.ok) return result;

  await refreshApprovedSpecialistProfilesFromRemoteAsync();
  await refreshAdminSpecialistDirectoryFromRemote();
  return { ok: true };
}

/** @deprecated Prefer updateAdminSpecialistBasicsAsync */
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
  void updateAdminSpecialistBasicsAsync(trainerId, basics);
}

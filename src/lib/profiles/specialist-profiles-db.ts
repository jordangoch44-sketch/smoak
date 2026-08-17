import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpecialistProfileRow } from "@/types/database";
import type { SpecialistProfileOverrides } from "@/types/specialist-profile-edit";
import type {
  Certification,
  ClientTransformationPhoto,
  Gender,
  Review,
  SocialLinks,
  Trainer,
  TrainerMediaItem,
  TrainerReviewSources,
} from "@/types/trainer";
import {
  firstNameFromPersonName,
  isBusinessDerivedFirstName,
} from "@/lib/specialist-display-name";
import { resolveTrainerProfessionCategory } from "@/lib/profession-category";
import { applySpecialistProfileOverrides } from "@/lib/specialist-profile-overrides";
import { parseGender } from "@/lib/gender";

export type SpecialistProfilesMutationResult =
  | { ok: true }
  | { ok: false; message: string };

export type SpecialistProfilesFetchResult =
  | { ok: true; profiles: Trainer[]; overridesById: Record<string, SpecialistProfileOverrides> }
  | { ok: false; message: string };

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asGender(value: unknown): Gender | "" {
  return parseGender(value);
}

function asGallery(value: unknown): TrainerMediaItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index): TrainerMediaItem | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const src = asString(row.src).trim();
      if (!src) return null;
      return {
        id: asString(row.id, `gallery-${index}`),
        type: row.type === "video" ? "video" : "image",
        src,
        poster:
          typeof row.poster === "string" && row.poster.trim()
            ? row.poster.trim()
            : undefined,
        alt: asString(row.alt),
      };
    })
    .filter((item): item is TrainerMediaItem => item != null);
}

function asClientTransformations(
  value: unknown
): ClientTransformationPhoto[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index): ClientTransformationPhoto | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const src = asString(row.src).trim();
      if (!src) return null;
      return {
        id: asString(row.id, `transform-${index}`),
        src,
        alt: asString(row.alt),
      };
    })
    .filter((item): item is ClientTransformationPhoto => item != null);
}

function asCertifications(value: unknown): Certification[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): Certification | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name = asString(row.name).trim();
      if (!name) return null;
      return {
        name,
        issuer: asString(row.issuer),
        year: asNumber(row.year, 0),
      };
    })
    .filter((item): item is Certification => item != null);
}

function asReviews(value: unknown): Review[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index): Review | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        id: asString(row.id, `review-${index}`),
        author: asString(row.author),
        rating: asNumber(row.rating, 0),
        text: asString(row.text),
        date: asString(row.date),
      };
    })
    .filter((item): item is Review => item != null);
}

function asSocial(value: unknown): SocialLinks {
  if (!value || typeof value !== "object") return {};
  const row = value as Record<string, unknown>;
  const social: SocialLinks = {};
  if (typeof row.instagram === "string") social.instagram = row.instagram;
  if (typeof row.twitter === "string") social.twitter = row.twitter;
  if (typeof row.linkedin === "string") social.linkedin = row.linkedin;
  if (typeof row.website === "string") social.website = row.website;
  if (typeof row.tiktok === "string") social.tiktok = row.tiktok;
  if (typeof row.googleReviewsUrl === "string") {
    social.googleReviewsUrl = row.googleReviewsUrl;
  }
  if (typeof row.googlePlaceId === "string") {
    social.googlePlaceId = row.googlePlaceId;
  }
  if (typeof row.googleRating === "number") {
    social.googleRating = row.googleRating;
  }
  if (typeof row.googleReviewCount === "number") {
    social.googleReviewCount = row.googleReviewCount;
  }
  if (typeof row.googleFetchedAt === "string") {
    social.googleFetchedAt = row.googleFetchedAt;
  }
  return social;
}

function asReviewSources(value: unknown): TrainerReviewSources | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const sources: TrainerReviewSources = {};
  if (typeof row.smoac === "number") sources.smoac = row.smoac;
  if (typeof row.google === "number") sources.google = row.google;
  if (typeof row.yelp === "number") sources.yelp = row.yelp;
  if (typeof row.other === "number") sources.other = row.other;
  return Object.keys(sources).length > 0 ? sources : undefined;
}

/** Normalize incomplete `profile_data` JSON so profile UI never crashes on `.map` / `.some`. */
function trainerFromProfileData(
  id: string,
  profileData: Record<string, unknown>
): Trainer {
  const gallery = asGallery(profileData.gallery);
  const galleryImages = asStringArray(profileData.galleryImages);
  const heroImage =
    asString(profileData.heroImage) ||
    galleryImages[0] ||
    gallery[0]?.src ||
    asString(profileData.image);
  const image = asString(profileData.image) || heroImage;

  return {
    id,
    name: asString(profileData.name),
    specialistFirstName:
      typeof profileData.specialistFirstName === "string"
        ? profileData.specialistFirstName
        : undefined,
    profession: asString(profileData.profession),
    title: asString(profileData.title),
    location: asString(profileData.location),
    city: asString(profileData.city),
    state:
      typeof profileData.state === "string" ? profileData.state : undefined,
    neighborhood: asString(profileData.neighborhood),
    serviceArea: asStringArray(profileData.serviceArea),
    serviceAreaZipCodes: asStringArray(profileData.serviceAreaZipCodes),
    serviceAreaDescription:
      typeof profileData.serviceAreaDescription === "string"
        ? profileData.serviceAreaDescription
        : undefined,
    zipCode: asString(profileData.zipCode),
    latitude: asNumber(profileData.latitude, Number.NaN),
    longitude: asNumber(profileData.longitude, Number.NaN),
    workAddress:
      typeof profileData.workAddress === "string"
        ? profileData.workAddress
        : undefined,
    locationPrecision:
      profileData.locationPrecision === "address" ||
      profileData.locationPrecision === "zip"
        ? profileData.locationPrecision
        : undefined,
    willingToTravel:
      typeof profileData.willingToTravel === "boolean"
        ? profileData.willingToTravel
        : undefined,
    serviceRadiusMiles:
      typeof profileData.serviceRadiusMiles === "number"
        ? profileData.serviceRadiusMiles
        : undefined,
    travelRadius:
      typeof profileData.travelRadius === "string"
        ? profileData.travelRadius
        : undefined,
    serviceType:
      profileData.serviceType === "in-person" ||
      profileData.serviceType === "virtual" ||
      profileData.serviceType === "both"
        ? profileData.serviceType
        : undefined,
    sponsored: Boolean(profileData.sponsored),
    categorySpotlight: Boolean(profileData.categorySpotlight),
    verified:
      typeof profileData.verified === "boolean"
        ? profileData.verified
        : undefined,
    specialty: asStringArray(profileData.specialty),
    homepageSpecialties: asStringArray(profileData.homepageSpecialties),
    gender: asGender(profileData.gender),
    pricePerSession: asNumber(profileData.pricePerSession, 0),
    rating: asNumber(profileData.rating, 0),
    reviewCount: asNumber(profileData.reviewCount, 0),
    reviewSources: asReviewSources(profileData.reviewSources),
    galleryImages,
    pinnedPhotos: asStringArray(profileData.pinnedPhotos),
    image,
    heroImage,
    bio: asString(profileData.bio),
    bestFor: asStringArray(profileData.bestFor),
    coachingStyle: asStringArray(profileData.coachingStyle),
    whyClientsChoose: asStringArray(profileData.whyClientsChoose),
    resultsSnapshot: Array.isArray(profileData.resultsSnapshot)
      ? asStringArray(profileData.resultsSnapshot)
      : profileData.resultsSnapshot === null
        ? null
        : undefined,
    sessionExperience: asStringArray(profileData.sessionExperience),
    gallery,
    clientTransformations: asClientTransformations(
      profileData.clientTransformations
    ),
    featured: Boolean(profileData.featured),
    topRanked: Boolean(profileData.topRanked),
    isPremium: Boolean(profileData.isPremium),
    profileStyle:
      profileData.profileStyle &&
      typeof profileData.profileStyle === "object"
        ? (profileData.profileStyle as Trainer["profileStyle"])
        : undefined,
    certifications: asCertifications(profileData.certifications),
    reviews: asReviews(profileData.reviews),
    social: asSocial(profileData.social),
  };
}

/** Attach personal first name from profiles (source of truth over business name). */
export async function enrichTrainersWithSpecialistFirstNames(
  supabase: SupabaseClient,
  rows: readonly Pick<SpecialistProfileRow, "id" | "user_id">[],
  trainers: Trainer[]
): Promise<Trainer[]> {
  const needUserIds = [
    ...new Set(
      rows
        .filter((row) => Boolean(row.user_id))
        .map((row) => String(row.user_id))
    ),
  ];

  if (needUserIds.length === 0) return trainers;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, first_name")
    .in("user_id", needUserIds);

  if (error || !data?.length) {
    if (error) {
      console.warn(
        "[SMOAC profiles] specialist first-name enrich skipped:",
        error.message
      );
    }
    return trainers.map((trainer) => {
      const first = firstNameFromPersonName(trainer.specialistFirstName ?? "");
      if (!first || isBusinessDerivedFirstName(first, trainer.name ?? "")) {
        return { ...trainer, specialistFirstName: undefined };
      }
      return trainer;
    });
  }

  const firstByUser = new Map<string, string>();
  for (const row of data) {
    const first = firstNameFromPersonName(String(row.first_name ?? ""));
    if (first) firstByUser.set(String(row.user_id), first);
  }

  return trainers.map((trainer) => {
    const row = rows.find((r) => r.id === trainer.id);
    const fromProfile = row?.user_id
      ? firstByUser.get(String(row.user_id))
      : undefined;
    if (fromProfile) {
      return { ...trainer, specialistFirstName: fromProfile };
    }
    const existing = firstNameFromPersonName(trainer.specialistFirstName ?? "");
    if (!existing || isBusinessDerivedFirstName(existing, trainer.name ?? "")) {
      return { ...trainer, specialistFirstName: undefined };
    }
    return trainer;
  });
}

export function specialistProfileFromRow(row: SpecialistProfileRow): {
  trainer: Trainer;
  overrides: SpecialistProfileOverrides;
} {
  const overrides = (row.overrides ?? {}) as SpecialistProfileOverrides;
  const trainer = trainerFromProfileData(
    row.id,
    (row.profile_data ?? {}) as Record<string, unknown>
  );
  const withColumns: Trainer = {
      ...trainer,
      id: row.id,
      name: trainer.name || row.display_name || "",
      profession: resolveTrainerProfessionCategory({
        profession: trainer.profession || row.profession || "",
        title: trainer.title || "",
        specialty: trainer.specialty?.length
          ? trainer.specialty
          : asStringArray(row.specialty),
      }) ||
        trainer.profession ||
        row.profession ||
        "",
      city: trainer.city || row.city || "",
      state: trainer.state || row.state || "",
      neighborhood: trainer.neighborhood || row.neighborhood || "",
      zipCode: trainer.zipCode || row.zip_code || "",
      latitude:
        row.latitude != null && Number.isFinite(Number(row.latitude))
          ? Number(row.latitude)
          : Number.isFinite(trainer.latitude)
            ? trainer.latitude
            : 0,
      longitude:
        row.longitude != null && Number.isFinite(Number(row.longitude))
          ? Number(row.longitude)
          : Number.isFinite(trainer.longitude)
            ? trainer.longitude
            : 0,
      workAddress: trainer.workAddress,
      locationPrecision: trainer.locationPrecision,
      specialty: trainer.specialty?.length
        ? trainer.specialty
        : asStringArray(row.specialty),
      pricePerSession: trainer.pricePerSession || row.price_per_session || 0,
      /* Columns are the source of truth for admin placement flags —
       * profile_data snapshots go stale when admins toggle featured/sponsored. */
      featured:
        typeof row.featured === "boolean" ? row.featured : Boolean(trainer.featured),
      sponsored:
        typeof row.sponsored === "boolean" ? row.sponsored : Boolean(trainer.sponsored),
      topRanked:
        typeof row.top_ranked === "boolean"
          ? row.top_ranked
          : Boolean(trainer.topRanked),
      categorySpotlight:
        typeof row.category_spotlight === "boolean"
          ? row.category_spotlight
          : Boolean(trainer.categorySpotlight),
      isPremium:
        typeof row.is_premium === "boolean"
          ? row.is_premium
          : Boolean(trainer.isPremium),
      verified: trainer.verified ?? row.verified,
      rating: trainer.rating || Number(row.rating) || 0,
      reviewCount: trainer.reviewCount || row.review_count || 0,
  };

  /* Durable overrides (Instagram, bio edits, etc.) live in the overrides JSON
   * column. Public Marketplace / Profile Sheet read profile_data only in live
   * mode — merge here so Connect / toolbar Instagram carry over after save. */
  return {
    trainer: applySpecialistProfileOverrides(withColumns, overrides),
    overrides,
  };
}

export function specialistProfileToRow(input: {
  trainer: Trainer;
  overrides?: SpecialistProfileOverrides | null;
  userId?: string | null;
  applicationId?: string | null;
  status?: SpecialistProfileRow["status"];
}): SpecialistProfileRow {
  const { trainer, overrides = {}, userId = null, applicationId = null } = input;
  const now = new Date().toISOString();
  return {
    id: trainer.id,
    user_id: userId,
    application_id: applicationId ?? null,
    status: input.status ?? "approved",
    display_name: trainer.name ?? "",
    profession: trainer.profession ?? "",
    city: trainer.city ?? "",
    state: trainer.state ?? "",
    neighborhood: trainer.neighborhood ?? "",
    zip_code: trainer.zipCode ?? "",
    latitude: trainer.latitude ?? null,
    longitude: trainer.longitude ?? null,
    specialty: trainer.specialty ?? [],
    price_per_session: trainer.pricePerSession ?? 0,
    service_type: trainer.serviceType ?? null,
    featured: Boolean(trainer.featured),
    sponsored: Boolean(trainer.sponsored),
    top_ranked: Boolean(trainer.topRanked),
    category_spotlight: Boolean(trainer.categorySpotlight),
    is_premium: Boolean(trainer.isPremium),
    verified: Boolean(trainer.verified),
    rating: trainer.rating ?? 0,
    review_count: trainer.reviewCount ?? 0,
    profile_data: trainer as unknown as Record<string, unknown>,
    overrides: (overrides ?? {}) as Record<string, unknown>,
    created_at: now,
    updated_at: now,
  };
}

/** Public catalog rows (approved only) — works for anon + authenticated. */
export async function fetchApprovedSpecialistProfiles(
  supabase: SupabaseClient
): Promise<SpecialistProfilesFetchResult> {
  const { data, error } = await supabase
    .from("specialist_profiles")
    .select("*")
    .eq("status", "approved")
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  const rows = (data ?? []) as SpecialistProfileRow[];
  const profiles: Trainer[] = [];
  const overridesById: Record<string, SpecialistProfileOverrides> = {};

  for (const row of rows) {
    const parsed = specialistProfileFromRow(row);
    profiles.push(parsed.trainer);
    if (parsed.overrides && Object.keys(parsed.overrides).length > 0) {
      overridesById[row.id] = parsed.overrides;
    }
  }

  const enriched = await enrichTrainersWithSpecialistFirstNames(
    supabase,
    rows,
    profiles
  );

  return { ok: true, profiles: enriched, overridesById };
}

export async function upsertSpecialistProfile(
  supabase: SupabaseClient,
  input: {
    trainer: Trainer;
    overrides?: SpecialistProfileOverrides | null;
    userId?: string | null;
    applicationId?: string | null;
    status?: SpecialistProfileRow["status"];
  }
): Promise<SpecialistProfilesMutationResult> {
  const row = specialistProfileToRow(input);
  /* featured/sponsored/top_ranked/is_premium are intentionally omitted: they are
   * admin placement flags managed via setSpecialistProfileFlags. Including them
   * here would let re-approvals / profile edits clobber admin-set values
   * (inserts fall back to the DB defaults of false). */
  const { error } = await supabase.from("specialist_profiles").upsert(
    {
      id: row.id,
      user_id: row.user_id,
      application_id: row.application_id,
      status: row.status,
      display_name: row.display_name,
      profession: row.profession,
      city: row.city,
      state: row.state,
      neighborhood: row.neighborhood,
      zip_code: row.zip_code,
      latitude: row.latitude,
      longitude: row.longitude,
      specialty: row.specialty,
      price_per_session: row.price_per_session,
      service_type: row.service_type,
      verified: row.verified,
      rating: row.rating,
      review_count: row.review_count,
      profile_data: row.profile_data,
      overrides: row.overrides,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** Admin placement flags — durable column update. */
export async function setSpecialistProfileFlags(
  supabase: SupabaseClient,
  id: string,
  flags: {
    featured?: boolean;
    sponsored?: boolean;
    topRanked?: boolean;
    isPremium?: boolean;
  }
): Promise<SpecialistProfilesMutationResult> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof flags.featured === "boolean") patch.featured = flags.featured;
  if (typeof flags.sponsored === "boolean") patch.sponsored = flags.sponsored;
  if (typeof flags.topRanked === "boolean") patch.top_ranked = flags.topRanked;
  if (typeof flags.isPremium === "boolean") patch.is_premium = flags.isPremium;

  const { error } = await supabase
    .from("specialist_profiles")
    .update(patch)
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** Admin ops fields — protected + account kind. */
export async function setSpecialistProfileOpsFields(
  supabase: SupabaseClient,
  id: string,
  fields: {
    isProtected?: boolean;
    accountKind?: "real" | "test";
  }
): Promise<SpecialistProfilesMutationResult> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof fields.isProtected === "boolean") {
    patch.is_protected = fields.isProtected;
  }
  if (fields.accountKind === "real" || fields.accountKind === "test") {
    patch.account_kind = fields.accountKind;
  }

  const { error } = await supabase
    .from("specialist_profiles")
    .update(patch)
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** Admin basics edit — durable columns on specialist_profiles. */
export async function updateSpecialistProfileBasics(
  supabase: SupabaseClient,
  id: string,
  basics: {
    profession?: string;
    specialty?: string[];
    city?: string;
    state?: string;
    neighborhood?: string;
    zipCode?: string;
    serviceType?: "in-person" | "virtual" | "both";
  }
): Promise<SpecialistProfilesMutationResult> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (basics.profession != null) patch.profession = basics.profession;
  if (basics.specialty != null) patch.specialty = basics.specialty;
  if (basics.city != null) patch.city = basics.city;
  if (basics.state != null) patch.state = basics.state;
  if (basics.neighborhood != null) patch.neighborhood = basics.neighborhood;
  if (basics.zipCode != null) patch.zip_code = basics.zipCode;
  if (basics.serviceType != null) patch.service_type = basics.serviceType;

  const { error } = await supabase
    .from("specialist_profiles")
    .update(patch)
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export type SpecialistModerationRow = {
  id: string;
  status: SpecialistProfileRow["status"];
  featured: boolean;
  sponsored: boolean;
  topRanked: boolean;
  isPremium: boolean;
  userId: string | null;
};

/**
 * Admin-visible moderation snapshot (all statuses). Used to sync local hide/meta
 * mirrors after hydrate. Requires admin or owner RLS.
 */
export async function fetchSpecialistModerationSnapshot(
  supabase: SupabaseClient
): Promise<
  | { ok: true; rows: SpecialistModerationRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("specialist_profiles")
    .select("id, status, featured, sponsored, top_ranked, is_premium, user_id")
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  const rows: SpecialistModerationRow[] = ((data ?? []) as Array<{
    id: string;
    status: string;
    featured: boolean | null;
    sponsored: boolean | null;
    top_ranked: boolean | null;
    is_premium: boolean | null;
    user_id: string | null;
  }>).map((row) => ({
    id: row.id,
    status: row.status,
    featured: Boolean(row.featured),
    sponsored: Boolean(row.sponsored),
    topRanked: Boolean(row.top_ranked),
    isPremium: Boolean(row.is_premium),
    userId: row.user_id,
  }));

  return { ok: true, rows };
}

export type AdminSpecialistDirectoryEntry = {
  trainer: Trainer;
  status: SpecialistProfileRow["status"];
  /** Account / application email when resolvable (admin roster). */
  email: string | null;
};

async function fetchEmailsByUserIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email")
    .in("user_id", unique);

  if (error || !data) return map;
  for (const row of data as Array<{ user_id: string; email: string | null }>) {
    const email = String(row.email ?? "").trim().toLowerCase();
    if (email) map.set(row.user_id, email);
  }
  return map;
}

async function fetchEmailsByApplicationIds(
  supabase: SupabaseClient,
  applicationIds: string[]
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(applicationIds.map((id) => id.trim()).filter(Boolean)),
  ];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("specialist_applications")
    .select("id, email")
    .in("id", unique);

  if (error || !data) return map;
  for (const row of data as Array<{ id: string; email: string | null }>) {
    const email = String(row.email ?? "").trim().toLowerCase();
    if (email) map.set(row.id, email);
  }
  return map;
}

/**
 * Full specialist_profiles directory for admin roster (all statuses).
 * Requires admin RLS — guests will get an error (callers should ignore).
 */
export async function fetchAdminSpecialistDirectory(
  supabase: SupabaseClient
): Promise<
  | { ok: true; entries: AdminSpecialistDirectoryEntry[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("specialist_profiles")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  const rows = (data ?? []) as SpecialistProfileRow[];
  const userIds = rows
    .map((row) => row.user_id)
    .filter((id): id is string => Boolean(id));
  const applicationIds = rows
    .map((row) => row.application_id)
    .filter((id): id is string => Boolean(id));

  const [emailsByUserId, emailsByApplicationId] = await Promise.all([
    fetchEmailsByUserIds(supabase, userIds),
    fetchEmailsByApplicationIds(supabase, applicationIds),
  ]);

  const entries: AdminSpecialistDirectoryEntry[] = [];
  for (const row of rows) {
    const parsed = specialistProfileFromRow(row);
    const fromProfile =
      (row.user_id && emailsByUserId.get(row.user_id)) || null;
    const fromApplication =
      (row.application_id && emailsByApplicationId.get(row.application_id)) ||
      null;
    entries.push({
      trainer: parsed.trainer,
      status: row.status,
      email: fromProfile || fromApplication || null,
    });
  }
  return { ok: true, entries };
}

export async function setSpecialistProfileStatus(
  supabase: SupabaseClient,
  id: string,
  status: "approved" | "hidden" | "archived"
): Promise<SpecialistProfilesMutationResult> {
  const { error } = await supabase
    .from("specialist_profiles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}


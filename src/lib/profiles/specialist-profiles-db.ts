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
import { parseGallerySlideshowFrames } from "@/lib/media/slideshow-frame";
import { overlayGoogleSocialIfMissing } from "@/lib/google-reviews-display";
import { applySpecialistProfileOverrides } from "@/lib/specialist-profile-overrides";
import { parseGender } from "@/lib/gender";
import { parseTravelToClients } from "@/types/specialist-service-area";
import { parseTrainingOptions } from "@/types/specialist-training-options";
import {
  parseMembershipPlan,
  type SpecialistMembershipPlan,
} from "@/lib/specialist-premium";
import { hydrateTrainerPublicSlugs } from "@/lib/trainer-profile-path";
import {
  applyCampaignExpiryToTrainerFlags,
} from "@/lib/stripe/activate-boost-campaign";
import {
  resolveTrainerSessionPriceRange,
  withSyncedSessionPrices,
} from "@/lib/session-price";

function isMissingColumnError(error: { message?: string } | null, column: string): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes(column) && message.includes("does not exist");
}

/** Listing entitlement from columns, with profile_data as fallback when the plan column is missing. */
export function listingMembershipFromRow(row: {
  is_premium?: boolean | null;
  membership_plan?: unknown;
  profile_data?: unknown;
}): { isPremium: boolean; plan: SpecialistMembershipPlan } {
  const profileData =
    row.profile_data && typeof row.profile_data === "object"
      ? (row.profile_data as Record<string, unknown>)
      : {};
  const plan = parseMembershipPlan(
    row.membership_plan ?? profileData.membershipPlan
  );
  const isPremium = Boolean(row.is_premium) || plan !== "free";
  return {
    isPremium,
    plan: plan === "free" && isPremium ? "premium" : plan,
  };
}

export type SpecialistProfilesFetchResult =
  | { ok: true; profiles: Trainer[]; overridesById: Record<string, SpecialistProfileOverrides> }
  | { ok: false; message: string };

export type SpecialistProfilesMutationResult =
  | { ok: true }
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
        duration:
          typeof row.duration === "number" && Number.isFinite(row.duration)
            ? Math.max(0, row.duration)
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
      if (typeof item === "string") {
        const src = item.trim();
        if (!src) return null;
        return {
          id: `transform-${index}`,
          src,
          alt: `Client transformation ${index + 1}`,
        };
      }
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
    slug:
      typeof profileData.slug === "string" && profileData.slug.trim()
        ? profileData.slug.trim()
        : undefined,
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
    workAddress2:
      typeof profileData.workAddress2 === "string"
        ? profileData.workAddress2
        : undefined,
    locationPrecision2:
      profileData.locationPrecision2 === "address" ||
      profileData.locationPrecision2 === "zip"
        ? profileData.locationPrecision2
        : undefined,
    city2:
      typeof profileData.city2 === "string" ? profileData.city2 : undefined,
    neighborhood2:
      typeof profileData.neighborhood2 === "string"
        ? profileData.neighborhood2
        : undefined,
    zipCode2:
      typeof profileData.zipCode2 === "string"
        ? profileData.zipCode2
        : undefined,
    latitude2:
      typeof profileData.latitude2 === "number" &&
      Number.isFinite(profileData.latitude2)
        ? profileData.latitude2
        : undefined,
    longitude2:
      typeof profileData.longitude2 === "number" &&
      Number.isFinite(profileData.longitude2)
        ? profileData.longitude2
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
    travelToClients: parseTravelToClients(profileData.travelToClients),
    serviceType:
      profileData.serviceType === "in-person" ||
      profileData.serviceType === "virtual" ||
      profileData.serviceType === "both"
        ? profileData.serviceType
        : undefined,
    trainingOptions: parseTrainingOptions(profileData.trainingOptions, {
      sessionExperience: asStringArray(profileData.sessionExperience),
    }),
    sponsored: Boolean(profileData.sponsored),
    categorySpotlight: Boolean(profileData.categorySpotlight),
    verified:
      typeof profileData.verified === "boolean"
        ? profileData.verified
        : undefined,
    specialty: asStringArray(profileData.specialty),
    homepageSpecialties: asStringArray(profileData.homepageSpecialties),
    gender: asGender(profileData.gender),
    offersFreeFirstSession:
      typeof profileData.offersFreeFirstSession === "boolean"
        ? profileData.offersFreeFirstSession
        : true,
    ...withSyncedSessionPrices({
      pricePerSession: asNumber(profileData.pricePerSession, 0),
      pricePerSessionMin: asNumber(profileData.pricePerSessionMin, 0),
      pricePerSessionMax: asNumber(profileData.pricePerSessionMax, 0),
    }),
    rating: asNumber(profileData.rating, 0),
    reviewCount: asNumber(profileData.reviewCount, 0),
    reviewSources: asReviewSources(profileData.reviewSources),
    galleryImages,
    gallerySlideshowFrames: parseGallerySlideshowFrames(
      profileData.gallerySlideshowFrames
    ),
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
    membershipPlan: parseMembershipPlan(profileData.membershipPlan),
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
  const sessionPrice = resolveTrainerSessionPriceRange({
    pricePerSession: trainer.pricePerSession || row.price_per_session || 0,
    pricePerSessionMin: trainer.pricePerSessionMin,
    pricePerSessionMax: trainer.pricePerSessionMax,
  });
  const membership = listingMembershipFromRow(row);
  const withColumns: Trainer = {
      ...trainer,
      id: row.id,
      slug: trainer.slug,
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
      workAddress2: trainer.workAddress2,
      locationPrecision2: trainer.locationPrecision2,
      city2: trainer.city2,
      neighborhood2: trainer.neighborhood2,
      zipCode2: trainer.zipCode2,
      latitude2: trainer.latitude2,
      longitude2: trainer.longitude2,
      specialty: trainer.specialty?.length
        ? trainer.specialty
        : asStringArray(row.specialty),
      pricePerSession: sessionPrice.max,
      pricePerSessionMin: sessionPrice.min,
      pricePerSessionMax: sessionPrice.max,
      /* Columns are the source of truth for admin placement flags —
       * profile_data snapshots go stale when admins toggle featured/sponsored. */
      topRanked:
        typeof row.top_ranked === "boolean"
          ? row.top_ranked
          : Boolean(trainer.topRanked),
      ...applyCampaignExpiryToTrainerFlags({
        featured:
          typeof row.featured === "boolean"
            ? row.featured
            : Boolean(trainer.featured),
        sponsored:
          typeof row.sponsored === "boolean"
            ? row.sponsored
            : Boolean(trainer.sponsored),
        categorySpotlight:
          typeof row.category_spotlight === "boolean"
            ? row.category_spotlight
            : Boolean(trainer.categorySpotlight),
        campaignProduct: row.boost_campaign_product,
        campaignEndsAt: row.boost_campaign_ends_at,
      }),
      isPremium: membership.isPremium,
      membershipPlan: membership.plan,
      verified: membership.isPremium,
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
  const sessionPrice = resolveTrainerSessionPriceRange(trainer);
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
    price_per_session: sessionPrice.max,
    service_type: trainer.serviceType ?? null,
    featured: Boolean(trainer.featured),
    sponsored: Boolean(trainer.sponsored),
    top_ranked: Boolean(trainer.topRanked),
    category_spotlight: Boolean(trainer.categorySpotlight),
    is_premium: Boolean(trainer.isPremium),
    membership_plan: parseMembershipPlan(trainer.membershipPlan),
    verified: Boolean(trainer.verified),
    rating: trainer.rating ?? 0,
    review_count: trainer.reviewCount ?? 0,
    profile_data: withSyncedSessionPrices(trainer) as unknown as Record<string, unknown>,
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

  return {
    ok: true,
    profiles: hydrateTrainerPublicSlugs(enriched),
    overridesById,
  };
}

/** Resolve an approved listing by durable id or public slug. */
export async function fetchApprovedSpecialistByPublicKey(
  supabase: SupabaseClient,
  publicKey: string
): Promise<Trainer | null> {
  const key = publicKey.trim();
  if (!key) return null;

  const byId = await supabase
    .from("specialist_profiles")
    .select("*")
    .eq("id", key)
    .eq("status", "approved")
    .maybeSingle();

  let row = (!byId.error && byId.data
    ? (byId.data as SpecialistProfileRow)
    : null);

  if (!row) {
    const bySlug = await supabase
      .from("specialist_profiles")
      .select("*")
      .eq("status", "approved")
      .filter("profile_data->>slug", "eq", key)
      .maybeSingle();
    if (!bySlug.error && bySlug.data) {
      row = bySlug.data as SpecialistProfileRow;
    }
  }

  if (!row) return null;
  const mapped = specialistProfileFromRow(row).trainer;
  const [enriched] = await enrichTrainersWithSpecialistFirstNames(
    supabase,
    [row],
    [mapped]
  );
  return hydrateTrainerPublicSlugs([enriched])[0] ?? enriched;
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
  const { data: existing } = await supabase
    .from("specialist_profiles")
    .select("is_premium, profile_data")
    .eq("id", row.id)
    .maybeSingle();

  const profileData =
    row.profile_data && typeof row.profile_data === "object"
      ? { ...(row.profile_data as Record<string, unknown>) }
      : {};
  if (existing) {
    const membership = listingMembershipFromRow(existing);
    profileData.isPremium = membership.isPremium;
    profileData.membershipPlan = membership.plan;
    profileData.verified = membership.isPremium;
    const existingData =
      existing.profile_data && typeof existing.profile_data === "object"
        ? (existing.profile_data as Record<string, unknown>)
        : null;
    const existingSocial =
      existingData?.social && typeof existingData.social === "object"
        ? (existingData.social as SocialLinks)
        : undefined;
    const incomingSocial =
      profileData.social && typeof profileData.social === "object"
        ? (profileData.social as SocialLinks)
        : undefined;
    profileData.social = overlayGoogleSocialIfMissing(
      incomingSocial,
      existingSocial
    );
  }

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
      profile_data: profileData,
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

/** Resolve the durable listing id (profile id, application id, or linked user). */
export async function resolveSpecialistProfileId(
  supabase: SupabaseClient,
  input: { profileId?: string | null; userId?: string | null }
): Promise<string | null> {
  const profileId = input.profileId?.trim() || "";
  if (profileId) {
    const byId = await supabase
      .from("specialist_profiles")
      .select("id")
      .eq("id", profileId)
      .maybeSingle();
    if (typeof byId.data?.id === "string" && byId.data.id) {
      return byId.data.id;
    }
    const byApplication = await supabase
      .from("specialist_profiles")
      .select("id")
      .eq("application_id", profileId)
      .maybeSingle();
    if (typeof byApplication.data?.id === "string" && byApplication.data.id) {
      return byApplication.data.id;
    }
  }

  const userId = input.userId?.trim() || "";
  if (userId) {
    const byUser = await supabase
      .from("specialist_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (typeof byUser.data?.id === "string" && byUser.data.id) {
      return byUser.data.id;
    }
    const { data: application } = await supabase
      .from("specialist_applications")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    const applicationId =
      typeof application?.id === "string" ? application.id.trim() : "";
    if (applicationId) {
      const byApplicationId = await supabase
        .from("specialist_profiles")
        .select("id")
        .eq("id", applicationId)
        .maybeSingle();
      if (typeof byApplicationId.data?.id === "string" && byApplicationId.data.id) {
        return byApplicationId.data.id;
      }
      const byApplicationFk = await supabase
        .from("specialist_profiles")
        .select("id")
        .eq("application_id", applicationId)
        .maybeSingle();
      if (
        typeof byApplicationFk.data?.id === "string" &&
        byApplicationFk.data.id
      ) {
        return byApplicationFk.data.id;
      }
    }
  }

  return null;
}

function membershipProfileDataPatch(
  profileData: Record<string, unknown> | null | undefined,
  plan: SpecialistMembershipPlan
): Record<string, unknown> {
  const isPremium = plan !== "free";
  const next =
    profileData && typeof profileData === "object" ? { ...profileData } : {};
  next.isPremium = isPremium;
  next.membershipPlan = plan;
  next.verified = isPremium;
  return next;
}

/** Merge membership onto columns + profile_data so public JSON snapshots stay live. */
export async function setSpecialistProfileMembership(
  supabase: SupabaseClient,
  id: string,
  plan: SpecialistMembershipPlan
): Promise<SpecialistProfilesMutationResult> {
  const profileId = await resolveSpecialistProfileId(supabase, {
    profileId: id,
  });
  if (!profileId) {
    return { ok: false, message: "Specialist listing was not found." };
  }

  const isPremium = plan !== "free";
  const now = new Date().toISOString();
  const { data: row, error: readError } = await supabase
    .from("specialist_profiles")
    .select("profile_data")
    .eq("id", profileId)
    .maybeSingle();

  if (readError) {
    return { ok: false, message: readError.message };
  }

  const profileData = membershipProfileDataPatch(
    row?.profile_data as Record<string, unknown> | undefined,
    plan
  );

  const { data: updated, error } = await supabase
    .from("specialist_profiles")
    .update({
      is_premium: isPremium,
      verified: isPremium,
      profile_data: profileData,
      updated_at: now,
    })
    .eq("id", profileId)
    .select("id");

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!updated?.length) {
    return { ok: false, message: "Could not update listing membership." };
  }

  const withPlan = await supabase
    .from("specialist_profiles")
    .update({ membership_plan: plan, updated_at: now })
    .eq("id", profileId)
    .select("id");
  if (withPlan.error && !isMissingColumnError(withPlan.error, "membership_plan")) {
    return { ok: false, message: withPlan.error.message };
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
  if (typeof flags.isPremium === "boolean") {
    const membership = await setSpecialistProfileMembership(
      supabase,
      id,
      flags.isPremium ? "premium" : "free"
    );
    if (!membership.ok) return membership;
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof flags.featured === "boolean") patch.featured = flags.featured;
  if (typeof flags.sponsored === "boolean") patch.sponsored = flags.sponsored;
  if (typeof flags.topRanked === "boolean") patch.top_ranked = flags.topRanked;

  if (Object.keys(patch).length === 1) {
    return { ok: true };
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


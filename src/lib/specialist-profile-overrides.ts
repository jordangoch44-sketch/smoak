import { zipCodeToCoordinates } from "@/lib/geo/zip-centroids";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { sanitizeHomepageSpecialties } from "@/lib/specialty-display";
import { buildTrainerGalleryImages, syncTrainerGalleryImages } from "@/lib/trainer-gallery";
import { normalizePinnedPhotos, parseMediaUrlList } from "@/lib/specialist-media-limits";
import { parseTravelRadiusMiles } from "@/lib/specialist-service-area";
import { normalizeProfileStyle } from "@/lib/specialist-profile-style";
import { computeTrainerReviewCount } from "@/lib/trainer-reviews";
import type { Certification, Trainer } from "@/types";
import type {
  SpecialistProfileEditForm,
  SpecialistProfileOverrides,
} from "@/types/specialist-profile-edit";

/** DEV ONLY — persisted specialist profile edits (offline / seed mode) */
export const DEV_SPECIALIST_PROFILE_OVERRIDES_KEY =
  "smoac_specialist_profile_overrides";

/** In-session override buffer when Supabase is live (durable SoT is specialist_profiles). */
let liveMemoryOverrides: Record<string, SpecialistProfileOverrides> | null =
  null;

export const EMPTY_CERTIFICATION: Certification = {
  name: "",
  issuer: "",
  year: new Date().getFullYear(),
};

/** Deep-enough copy for section drafts — arrays and cert objects are cloned. */
export function cloneSpecialistProfileEditForm(
  form: SpecialistProfileEditForm
): SpecialistProfileEditForm {
  return {
    ...form,
    specialty: [...form.specialty],
    homepageSpecialties: [...form.homepageSpecialties],
    serviceArea: [...form.serviceArea],
    pinnedPhotos: [...form.pinnedPhotos],
    certifications: form.certifications.map((cert) => ({ ...cert })),
  };
}

function syncLocation(trainer: Trainer): Trainer {
  const neighborhood = trainer.neighborhood.trim();
  const city = trainer.city.trim();
  return {
    ...trainer,
    location: neighborhood ? `${neighborhood}, ${city}` : city,
  };
}

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLineList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Split free-text into pills (commas / newlines / ·), or one item of prose. */
function parsePillList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (/[,;\n·]/.test(trimmed)) {
    return trimmed
      .split(/[,;\n·]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [trimmed];
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function applySpecialistProfileOverrides(
  base: Trainer,
  overrides: SpecialistProfileOverrides | null | undefined
): Trainer {
  if (!overrides) return base;

  const merged: Trainer = {
    ...base,
    ...overrides,
    specialty: overrides.specialty ?? base.specialty,
    homepageSpecialties:
      overrides.homepageSpecialties ?? base.homepageSpecialties,
    serviceArea: overrides.serviceArea ?? base.serviceArea,
    certifications: overrides.certifications ?? base.certifications,
    profileStyle: normalizeProfileStyle(
      overrides.profileStyle ?? base.profileStyle
    ),
    serviceRadiusMiles:
      overrides.serviceRadiusMiles ??
      (overrides.travelRadius
        ? parseTravelRadiusMiles(overrides.travelRadius)
        : undefined) ??
      base.serviceRadiusMiles,
    social: { ...base.social },
  };

  merged.homepageSpecialties = sanitizeHomepageSpecialties(
    merged.specialty,
    merged.homepageSpecialties
  );
  if (merged.homepageSpecialties.length === 0) {
    delete merged.homepageSpecialties;
  }

  if (overrides.zipCode?.trim()) {
    merged.zipCode = overrides.zipCode.trim();
  }
  if (overrides.workAddress !== undefined) {
    const address = overrides.workAddress.trim();
    if (address) merged.workAddress = address;
    else delete merged.workAddress;
  }
  if (overrides.locationPrecision === "address" || overrides.locationPrecision === "zip") {
    merged.locationPrecision = overrides.locationPrecision;
  }
  if (overrides.latitude != null && overrides.longitude != null) {
    merged.latitude = overrides.latitude;
    merged.longitude = overrides.longitude;
  } else if (merged.locationPrecision !== "address" && merged.zipCode) {
    const fromZip = zipCodeToCoordinates(merged.zipCode);
    if (fromZip) {
      merged.latitude = fromZip.latitude;
      merged.longitude = fromZip.longitude;
      merged.locationPrecision = "zip";
    }
  }

  if (overrides.bookingAvailability?.trim()) {
    const slots = parseCommaList(overrides.bookingAvailability);
    if (slots.length > 0) {
      merged.sessionExperience = slots;
    }
  }

  /* Form fields → public Trainer fields used by marketplace profile UI */
  if (overrides.trainingStyle?.trim()) {
    const pills = parsePillList(overrides.trainingStyle);
    if (pills.length > 0) merged.coachingStyle = pills;
  }
  if (overrides.servicesOffered?.trim()) {
    const pills = parsePillList(overrides.servicesOffered);
    if (pills.length > 0) merged.bestFor = pills;
  }
  if (
    overrides.instagram !== undefined ||
    overrides.website !== undefined ||
    overrides.tiktok !== undefined ||
    overrides.googleReviewsUrl !== undefined ||
    overrides.googlePlaceId !== undefined
  ) {
    merged.social = {
      ...merged.social,
      instagram: overrides.instagram?.trim() || merged.social.instagram,
      website: overrides.website?.trim() || merged.social.website,
      tiktok: overrides.tiktok?.trim() || merged.social.tiktok,
      googleReviewsUrl:
        overrides.googleReviewsUrl?.trim() || merged.social.googleReviewsUrl,
      googlePlaceId:
        overrides.googlePlaceId?.trim() || merged.social.googlePlaceId,
    };
  }

  if (overrides.profilePhotoUrl?.trim()) {
    const photo = overrides.profilePhotoUrl.trim();
    merged.image = photo;
    if (!overrides.coverImageUrl?.trim()) {
      merged.heroImage = photo;
    }
    merged.galleryImages = buildTrainerGalleryImages(
      merged.gallery,
      merged.heroImage,
      merged.galleryImages
    );
  }

  if (overrides.coverImageUrl?.trim()) {
    merged.heroImage = overrides.coverImageUrl.trim();
    merged.galleryImages = buildTrainerGalleryImages(
      merged.gallery,
      merged.heroImage,
      merged.galleryImages
    );
  }

  if (overrides.photoNotes?.trim()) {
    const photoUrls = parseLineList(overrides.photoNotes).filter(isUrl);
    if (photoUrls.length > 0) {
      const cover =
        overrides.coverImageUrl?.trim() && photoUrls.includes(overrides.coverImageUrl.trim())
          ? overrides.coverImageUrl.trim()
          : photoUrls[0];
      const ordered = cover
        ? [cover, ...photoUrls.filter((url) => url !== cover)]
        : photoUrls;
      merged.heroImage = cover || merged.heroImage;
      merged.gallery = ordered.map((src, index) => ({
        id: `profile-photo-${index}`,
        type: "image" as const,
        src,
        alt: `${merged.name} gallery photo ${index + 1}`,
      }));
      merged.galleryImages = ordered;
    }
  }

  if (overrides.videoNotes?.trim()) {
    const videoUrls = parseLineList(overrides.videoNotes).filter(isUrl);
    if (videoUrls.length > 0) {
      const imageItems = merged.gallery.filter((item) => item.type === "image");
      const videoItems = videoUrls.map((src, index) => ({
        id: `profile-video-${index}`,
        type: "video" as const,
        src,
        alt: `${merged.name} video ${index + 1}`,
      }));
      merged.gallery = [...imageItems, ...videoItems];
    }
  }

  merged.galleryImages = buildTrainerGalleryImages(
    merged.gallery,
    merged.heroImage,
    merged.galleryImages
  );
  merged.reviewCount = computeTrainerReviewCount(merged);

  if (overrides.pinnedPhotos !== undefined) {
    merged.pinnedPhotos = normalizePinnedPhotos(
      overrides.pinnedPhotos,
      merged.galleryImages
    );
  } else if (base.pinnedPhotos?.length) {
    merged.pinnedPhotos = normalizePinnedPhotos(
      base.pinnedPhotos,
      merged.galleryImages
    );
  }
  if (!merged.pinnedPhotos?.length) {
    delete merged.pinnedPhotos;
  }

  if (overrides.transformationNotes?.trim()) {
    const transformUrls = parseLineList(overrides.transformationNotes).filter(isUrl);
    if (transformUrls.length > 0) {
      merged.clientTransformations = transformUrls.map((src, index) => ({
        id: `profile-transform-${index}`,
        src,
        alt: `Client transformation ${index + 1}`,
      }));
    }
  }

  return syncLocation(syncTrainerGalleryImages(merged));
}

export function overridesFromTrainer(
  trainer: Trainer,
  stored?: SpecialistProfileOverrides | null
): SpecialistProfileEditForm {
  const style = normalizeProfileStyle(
    stored?.profileStyle ?? trainer.profileStyle
  );
  return {
    name: stored?.name ?? trainer.name,
    title: stored?.title ?? trainer.title,
    gender: stored?.gender ?? trainer.gender,
    profession: stored?.profession ?? trainer.profession,
    specialty: [...(stored?.specialty ?? trainer.specialty ?? [])],
    homepageSpecialties: sanitizeHomepageSpecialties(
      stored?.specialty ?? trainer.specialty ?? [],
      stored?.homepageSpecialties ?? trainer.homepageSpecialties
    ),
    certifications: (
      stored?.certifications ??
      trainer.certifications ??
      []
    ).map((cert) => ({ ...cert })),
    city: stored?.city ?? trainer.city,
    neighborhood: stored?.neighborhood ?? trainer.neighborhood,
    zipCode: stored?.zipCode ?? trainer.zipCode ?? "",
    serviceType: stored?.serviceType ?? trainer.serviceType ?? "both",
    travelRadius:
      stored?.travelRadius ??
      (stored?.serviceRadiusMiles != null
        ? String(stored.serviceRadiusMiles)
        : trainer.serviceRadiusMiles != null
          ? String(trainer.serviceRadiusMiles)
          : ""),
    serviceArea: [...(stored?.serviceArea ?? trainer.serviceArea ?? [])],
    workAddress: stored?.workAddress ?? trainer.workAddress ?? "",
    locationPrecision:
      stored?.locationPrecision === "address" ||
      trainer.locationPrecision === "address"
        ? "address"
        : "zip",
    latitude: stored?.latitude ?? trainer.latitude ?? null,
    longitude: stored?.longitude ?? trainer.longitude ?? null,
    pricePerSession: stored?.pricePerSession ?? trainer.pricePerSession,
    bio: stored?.bio ?? trainer.bio,
    photoNotes:
      stored?.photoNotes ??
      ((Array.isArray(trainer.galleryImages) ? trainer.galleryImages : [])
        .filter(Boolean)
        .join("\n") || ""),
    videoNotes:
      stored?.videoNotes ??
      (Array.isArray(trainer.gallery) ? trainer.gallery : [])
        .filter((item) => item.type === "video")
        .map((item) => item.src)
        .join("\n"),
    transformationNotes: stored?.transformationNotes ?? "",
    bookingAvailability:
      stored?.bookingAvailability ??
      (Array.isArray(trainer.sessionExperience)
        ? trainer.sessionExperience
        : []
      )
        .slice(0, 3)
        .join(", "),
    profilePhotoUrl:
      stored?.profilePhotoUrl?.trim() ||
      trainer.image?.trim() ||
      trainer.heroImage?.trim() ||
      "",
    coverImageUrl:
      stored?.coverImageUrl?.trim() ||
      (stored?.profilePhotoUrl?.trim() ? "" : trainer.heroImage?.trim() || ""),
    pinnedPhotos: normalizePinnedPhotos(
      stored?.pinnedPhotos ?? trainer.pinnedPhotos,
      (
        stored?.photoNotes?.trim()
          ? stored.photoNotes
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
          : Array.isArray(trainer.galleryImages)
            ? trainer.galleryImages
            : []
      ).filter(Boolean)
    ),
    phone: stored?.phone ?? "",
    email: stored?.email ?? "",
    instagram: stored?.instagram ?? trainer.social?.instagram ?? "",
    website: stored?.website ?? trainer.social?.website ?? "",
    tiktok: stored?.tiktok ?? trainer.social?.tiktok ?? "",
    googleReviewsUrl:
      stored?.googleReviewsUrl ?? trainer.social?.googleReviewsUrl ?? "",
    googlePlaceId: stored?.googlePlaceId ?? trainer.social?.googlePlaceId ?? "",
    experienceYears: stored?.experienceYears ?? "",
    trainingStyle:
      stored?.trainingStyle ??
      ((Array.isArray(trainer.coachingStyle) ? trainer.coachingStyle : [])
        .filter(Boolean)
        .join(" · ") || ""),
    servicesOffered:
      stored?.servicesOffered ??
      ((Array.isArray(trainer.bestFor) ? trainer.bestFor : [])
        .filter(Boolean)
        .join(", ") || ""),
    profileAccent: style.accent,
    profileAvatarFrame: style.avatarFrame,
    profileNameFont: style.nameFont,
  };
}

export function formToOverrides(form: SpecialistProfileEditForm): SpecialistProfileOverrides {
  const travel = form.travelRadius.trim();
  const radiusMiles = parseTravelRadiusMiles(travel);
  const specialty = form.specialty.map((s) => s.trim()).filter(Boolean);
  const homepageSpecialties = sanitizeHomepageSpecialties(
    specialty,
    form.homepageSpecialties
  );
  return {
    name: form.name.trim(),
    title: form.title.trim(),
    gender: form.gender,
    profession: form.profession.trim(),
    specialty,
    homepageSpecialties,
    certifications: form.certifications.filter((c) => c.name.trim()),
    city: form.city.trim(),
    neighborhood: form.neighborhood.trim(),
    zipCode: form.zipCode.trim(),
    serviceType: form.serviceType,
    travelRadius: travel || undefined,
    serviceRadiusMiles: radiusMiles,
    serviceArea: form.serviceArea.map((s) => s.trim()).filter(Boolean),
    workAddress: form.workAddress.trim(),
    locationPrecision: form.locationPrecision,
    ...(form.latitude != null && form.longitude != null
      ? { latitude: form.latitude, longitude: form.longitude }
      : {}),
    pricePerSession: form.pricePerSession,
    bio: form.bio.trim(),
    photoNotes: form.photoNotes.trim(),
    videoNotes: form.videoNotes.trim(),
    transformationNotes: form.transformationNotes.trim(),
    bookingAvailability: form.bookingAvailability.trim(),
    profilePhotoUrl: form.profilePhotoUrl.trim(),
    coverImageUrl: form.coverImageUrl.trim(),
    pinnedPhotos: normalizePinnedPhotos(
      form.pinnedPhotos,
      parseMediaUrlList(form.photoNotes)
    ),
    phone: form.phone.trim(),
    email: form.email.trim(),
    instagram: form.instagram.trim(),
    website: form.website.trim(),
    tiktok: form.tiktok.trim(),
    googleReviewsUrl: form.googleReviewsUrl.trim(),
    googlePlaceId: form.googlePlaceId.trim(),
    experienceYears: form.experienceYears.trim(),
    trainingStyle: form.trainingStyle.trim(),
    servicesOffered: form.servicesOffered.trim(),
    profileStyle: normalizeProfileStyle({
      accent: form.profileAccent,
      avatarFrame: form.profileAvatarFrame,
      nameFont: form.profileNameFont,
    }),
  };
}

export function computeProfileCompletion(
  form: SpecialistProfileEditForm
): number {
  const checks = [
    Boolean(form.name.trim()),
    Boolean(form.title.trim()),
    Boolean(form.profession.trim()),
    form.specialty.length > 0,
    Boolean(form.city.trim() || form.zipCode.trim()),
    Boolean(form.serviceType),
    form.pricePerSession > 0,
    form.bio.trim().length >= 40,
    Boolean(form.profilePhotoUrl.trim()),
    Boolean(form.bookingAvailability.trim()),
    Boolean(form.phone.trim() || form.email.trim()),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function loadAllSpecialistOverrides(): Record<
  string,
  SpecialistProfileOverrides
> {
  if (typeof window === "undefined") return {};
  /* Live: memory only — public catalog uses approved rows; dashboard edits
   * survive the session then sync via specialist_profiles. */
  if (isMarketplaceSupabaseActive()) {
    return liveMemoryOverrides ? { ...liveMemoryOverrides } : {};
  }
  try {
    const raw = window.localStorage.getItem(DEV_SPECIALIST_PROFILE_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SpecialistProfileOverrides>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function persistAllSpecialistOverrides(
  map: Record<string, SpecialistProfileOverrides>
): void {
  if (typeof window === "undefined") return;
  if (isMarketplaceSupabaseActive()) {
    liveMemoryOverrides = { ...map };
    return;
  }
  window.localStorage.setItem(
    DEV_SPECIALIST_PROFILE_OVERRIDES_KEY,
    JSON.stringify(map)
  );
}

export function loadSpecialistOverridesForId(
  trainerId: string
): SpecialistProfileOverrides | null {
  return loadAllSpecialistOverrides()[trainerId] ?? null;
}

export function saveSpecialistOverridesForId(
  trainerId: string,
  overrides: SpecialistProfileOverrides
): void {
  const map = loadAllSpecialistOverrides();
  map[trainerId] = overrides;
  persistAllSpecialistOverrides(map);
}

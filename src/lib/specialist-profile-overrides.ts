import { zipCodeToCoordinates } from "@/lib/geo/zip-centroids";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { normalizeOffersFreeFirstSession } from "@/lib/free-first-session";
import {
  sanitizeMarketplaceSpecialties,
  syncHomepageSpecialties,
  withSanitizedMarketplaceSpecialties,
} from "@/lib/specialty-display";
import { buildTrainerGalleryImages, syncTrainerGalleryImages } from "@/lib/trainer-gallery";
import {
  normalizePinnedPhotos,
  normalizeTransformationUrls,
  parseMediaUrlList,
  pinAllowList,
  serializeMediaUrlList,
} from "@/lib/specialist-media-limits";
import {
  parseSlideshowFrameMap,
  pruneSlideshowFrameMap,
  serializeSlideshowFrameMap,
} from "@/lib/media/slideshow-frame";
import {
  parseVideoPosterMap,
  pruneVideoPosterMap,
  resolveVideoPoster,
  serializeVideoPosterMap,
} from "@/lib/media/video-poster";
import {
  parseTravelRadiusMiles,
  travelToClientsFromLegacyRadius,
} from "@/lib/specialist-service-area";
import { parseTravelToClients } from "@/types/specialist-service-area";
import { parseTrainingOptions } from "@/types/specialist-training-options";
import { normalizeProfileStyle } from "@/lib/specialist-profile-style";
import { isTrainerProPlus } from "@/lib/specialist-premium";
import { computeTrainerReviewCount } from "@/lib/trainer-reviews";
import {
  hasSessionPrice,
  resolveTrainerSessionPriceRange,
  withSyncedSessionPrices,
} from "@/lib/session-price";
import {
  clonePricingOfferings,
  parsePricingOfferings,
} from "@/lib/specialist-pricing";
import type { Certification, Trainer } from "@/types";
import { rightFitCopyFromItems } from "@/lib/specialist-right-fit";
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
    trainingOptions: [...(form.trainingOptions ?? [])],
    certifications: form.certifications.map((cert) => ({ ...cert })),
    pricingOfferings: clonePricingOfferings(form.pricingOfferings ?? []),
  };
}

/** Fields each Instagram-style / settings row actually edits. Saving one row
 * must not rewrite the rest of the profile from a stale full-form clone. */
const PROFILE_SECTION_FIELDS: Record<
  string,
  readonly (keyof SpecialistProfileEditForm)[]
> = {
  hero: [
    "coverImageUrl",
    "photoNotes",
    "slideshowFramesJson",
    "pinnedPhotos",
  ],
  avatar: ["profilePhotoUrl"],
  videos: ["videoNotes", "videoPostersJson", "pinnedPhotos"],
  transformations: ["transformationNotes"],
  name: ["name"],
  headline: ["title"],
  profession: ["profession"],
  "professional-role": ["profession", "title"],
  specialties: ["specialty", "homepageSpecialties"],
  bio: ["bio"],
  philosophy: ["trainingStyle"],
  "ideal-clients": ["servicesOffered"],
  "service-area": [
    "workAddress",
    "locationPrecision",
    "latitude",
    "longitude",
    "city",
    "neighborhood",
    "zipCode",
    "workAddress2",
    "locationPrecision2",
    "latitude2",
    "longitude2",
    "city2",
    "neighborhood2",
    "zipCode2",
    "serviceType",
    "travelToClients",
    "travelRadius",
    "serviceArea",
    "trainingOptions",
    "offersFreeFirstSession",
    "bookingAvailability",
  ],
  "session-experience": ["trainingOptions"],
  credentials: ["certifications"],
  social: [
    "instagram",
    "website",
    "tiktok",
    "googleReviewsUrl",
    "googlePlaceId",
  ],
  pricing: [
    "pricingOfferings",
    "pricePerSession",
    "pricePerSessionMin",
    "pricePerSessionMax",
  ],
  "free-first-session": ["offersFreeFirstSession"],
  contact: ["phone", "email"],
  gender: ["gender"],
  "profile-style": ["profileAccent"],
  "basic-info": [
    "name",
    "title",
    "gender",
    "phone",
    "email",
    "profession",
  ],
  "photos-links": [
    "profilePhotoUrl",
    "coverImageUrl",
    "photoNotes",
    "slideshowFramesJson",
    "videoNotes",
    "videoPostersJson",
    "pinnedPhotos",
    "transformationNotes",
    "instagram",
    "website",
    "tiktok",
    "googleReviewsUrl",
    "googlePlaceId",
  ],
};

export function overlayProfileSectionDraft(
  latest: SpecialistProfileEditForm,
  draft: SpecialistProfileEditForm,
  section: string | null | undefined
): SpecialistProfileEditForm {
  const keys = section ? PROFILE_SECTION_FIELDS[section] : undefined;
  if (!keys) {
    return cloneSpecialistProfileEditForm({ ...latest, ...draft });
  }
  const next = cloneSpecialistProfileEditForm(latest);
  for (const key of keys) {
    const value = draft[key];
    Object.assign(next, { [key]: value });
  }
  if (section === "specialties") {
    next.specialty = sanitizeMarketplaceSpecialties(next.specialty);
    next.homepageSpecialties = syncHomepageSpecialties(
      next.specialty,
      next.homepageSpecialties
    );
  }
  if (section === "pricing") {
    next.pricingOfferings = parsePricingOfferings(next.pricingOfferings);
  }
  return cloneSpecialistProfileEditForm(next);
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

function isTransformationSrc(value: string): boolean {
  return isUrl(value) || /^data:image\//i.test(value);
}

function stripGalleryVideosUnlessProPlus(trainer: Trainer): Trainer {
  if (isTrainerProPlus(trainer)) return trainer;
  if (!trainer.gallery?.some((item) => item.type === "video")) return trainer;
  return {
    ...trainer,
    gallery: trainer.gallery.filter((item) => item.type !== "video"),
  };
}

export function applySpecialistProfileOverrides(
  base: Trainer,
  overrides: SpecialistProfileOverrides | null | undefined
): Trainer {
  if (!overrides) {
    return stripGalleryVideosUnlessProPlus(
      withSanitizedMarketplaceSpecialties(base)
    );
  }

  const merged: Trainer = {
    ...base,
    ...overrides,
    specialty: overrides.specialty ?? base.specialty,
    homepageSpecialties:
      overrides.homepageSpecialties ?? base.homepageSpecialties,
    serviceArea: overrides.serviceArea ?? base.serviceArea,
    certifications: overrides.certifications ?? base.certifications,
    offersFreeFirstSession: normalizeOffersFreeFirstSession(
      overrides.offersFreeFirstSession ?? base.offersFreeFirstSession
    ),
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

  if (overrides.travelToClients) {
    merged.travelToClients = overrides.travelToClients;
    merged.willingToTravel = overrides.travelToClients === "yes";
  }

  if (overrides.trainingOptions) {
    merged.trainingOptions = parseTrainingOptions(overrides.trainingOptions, {
      sessionExperience: merged.sessionExperience,
    });
  }

  merged.specialty = sanitizeMarketplaceSpecialties(merged.specialty);
  merged.homepageSpecialties = syncHomepageSpecialties(
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

  if (overrides.workAddress2 !== undefined) {
    const address = overrides.workAddress2.trim();
    if (address) merged.workAddress2 = address;
    else delete merged.workAddress2;
  }
  if (
    overrides.locationPrecision2 === "address" ||
    overrides.locationPrecision2 === "zip"
  ) {
    merged.locationPrecision2 = overrides.locationPrecision2;
  }
  if (overrides.city2 !== undefined) {
    const city = overrides.city2.trim();
    if (city) merged.city2 = city;
    else delete merged.city2;
  }
  if (overrides.neighborhood2 !== undefined) {
    const neighborhood = overrides.neighborhood2.trim();
    if (neighborhood) merged.neighborhood2 = neighborhood;
    else delete merged.neighborhood2;
  }
  if (overrides.zipCode2 !== undefined) {
    const zip = overrides.zipCode2.trim();
    if (zip) merged.zipCode2 = zip;
    else delete merged.zipCode2;
  }
  if (overrides.latitude2 != null && overrides.longitude2 != null) {
    merged.latitude2 = overrides.latitude2;
    merged.longitude2 = overrides.longitude2;
  } else if (merged.locationPrecision2 !== "address" && merged.zipCode2) {
    const fromZip = zipCodeToCoordinates(merged.zipCode2);
    if (fromZip) {
      merged.latitude2 = fromZip.latitude;
      merged.longitude2 = fromZip.longitude;
      merged.locationPrecision2 = "zip";
    }
  } else if (!merged.zipCode2 && !merged.workAddress2) {
    delete merged.latitude2;
    delete merged.longitude2;
    delete merged.locationPrecision2;
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
  if (overrides.servicesOffered !== undefined) {
    const copy = overrides.servicesOffered.trim();
    merged.bestFor = copy ? [copy] : [];
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
      instagram:
        overrides.instagram !== undefined
          ? overrides.instagram.trim() || undefined
          : merged.social?.instagram,
      website:
        overrides.website !== undefined
          ? overrides.website.trim() || undefined
          : merged.social?.website,
      tiktok:
        overrides.tiktok !== undefined
          ? overrides.tiktok.trim() || undefined
          : merged.social?.tiktok,
      googleReviewsUrl:
        (overrides.googleReviewsUrl !== undefined
          ? overrides.googleReviewsUrl.trim()
          : merged.social?.googleReviewsUrl) ||
        merged.social?.googleReviewsUrl,
      googlePlaceId:
        (overrides.googlePlaceId !== undefined
          ? overrides.googlePlaceId.trim()
          : merged.social?.googlePlaceId) ||
        merged.social?.googlePlaceId,
      googleRating: merged.social?.googleRating,
      googleReviewCount: merged.social?.googleReviewCount,
      googleFetchedAt: merged.social?.googleFetchedAt,
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

  if (isTrainerProPlus(merged) && overrides.videoNotes?.trim()) {
    const videoUrls = parseLineList(overrides.videoNotes).filter(isUrl);
    const posters = parseVideoPosterMap(overrides.videoPostersJson ?? "");
    if (videoUrls.length > 0) {
      const imageItems = merged.gallery.filter((item) => item.type === "image");
      const videoItems = videoUrls.map((src, index) => {
        const poster = resolveVideoPoster(posters, src);
        return {
          id: `profile-video-${index}`,
          type: "video" as const,
          src,
          alt: `${merged.name} video ${index + 1}`,
          ...(poster?.posterUrl ? { poster: poster.posterUrl } : {}),
          ...(poster ? { duration: poster.duration } : {}),
        };
      });
      merged.gallery = [...imageItems, ...videoItems];
    }
  } else if (!isTrainerProPlus(merged)) {
    merged.gallery = merged.gallery.filter((item) => item.type !== "video");
  }

  merged.galleryImages = buildTrainerGalleryImages(
    merged.gallery,
    merged.heroImage,
    merged.galleryImages
  );
  if (overrides.slideshowFramesJson?.trim()) {
    merged.gallerySlideshowFrames = pruneSlideshowFrameMap(
      parseSlideshowFrameMap(overrides.slideshowFramesJson),
      merged.galleryImages
    );
  } else if (merged.gallerySlideshowFrames) {
    merged.gallerySlideshowFrames = pruneSlideshowFrameMap(
      merged.gallerySlideshowFrames,
      merged.galleryImages
    );
  }
  merged.reviewCount = computeTrainerReviewCount(merged);

  const pinVideos = isTrainerProPlus(merged)
    ? merged.gallery
        .filter((item) => item.type === "video")
        .map((item) => item.src)
    : [];
  if (overrides.pinnedPhotos !== undefined) {
    merged.pinnedPhotos = normalizePinnedPhotos(
      overrides.pinnedPhotos,
      pinAllowList(merged.galleryImages, pinVideos)
    );
  } else if (base.pinnedPhotos?.length) {
    merged.pinnedPhotos = normalizePinnedPhotos(
      base.pinnedPhotos,
      pinAllowList(merged.galleryImages, pinVideos)
    );
  }
  if (!merged.pinnedPhotos?.length) {
    delete merged.pinnedPhotos;
  }

  if (typeof overrides.transformationNotes === "string") {
    const transformUrls = normalizeTransformationUrls(
      parseMediaUrlList(overrides.transformationNotes).filter(isTransformationSrc)
    );
    merged.clientTransformations = transformUrls.map((src, index) => ({
      id: `profile-transform-${index}`,
      src,
      alt: `Client result ${index + 1}`,
    }));
  }

  /* Columns are source of truth for Pro / PRO+ and placement. Spreading
   * leftover keys from overrides JSON must not hide the verified badge. */
  merged.isPremium = base.isPremium;
  merged.membershipPlan = base.membershipPlan;
  merged.verified = base.verified;
  merged.featured = base.featured;
  merged.sponsored = base.sponsored;
  merged.topRanked = base.topRanked;
  merged.categorySpotlight = base.categorySpotlight;

  const offerings = parsePricingOfferings(
    overrides.pricingOfferings ?? base.pricingOfferings
  );
  if (overrides.pricingOfferings !== undefined || offerings.length > 0) {
    merged.pricingOfferings = offerings;
  }

  return withSyncedSessionPrices(syncLocation(syncTrainerGalleryImages(merged)));
}

export function overridesFromTrainer(
  trainer: Trainer,
  stored?: SpecialistProfileOverrides | null
): SpecialistProfileEditForm {
  const style = normalizeProfileStyle(
    stored?.profileStyle ?? trainer.profileStyle
  );
  const specialty = sanitizeMarketplaceSpecialties(
    stored?.specialty ?? trainer.specialty ?? []
  );
  return {
    name: stored?.name ?? trainer.name,
    title: stored?.title ?? trainer.title,
    gender: stored?.gender ?? trainer.gender,
    profession: stored?.profession ?? trainer.profession,
    specialty,
    homepageSpecialties: syncHomepageSpecialties(
      specialty,
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
    trainingOptions: parseTrainingOptions(
      stored?.trainingOptions ?? trainer.trainingOptions,
      { sessionExperience: trainer.sessionExperience }
    ),
    travelRadius:
      stored?.travelRadius ??
      (stored?.serviceRadiusMiles != null
        ? String(stored.serviceRadiusMiles)
        : trainer.serviceRadiusMiles != null
          ? String(trainer.serviceRadiusMiles)
          : ""),
    travelToClients:
      parseTravelToClients(stored?.travelToClients) ||
      parseTravelToClients(trainer.travelToClients) ||
      travelToClientsFromLegacyRadius(
        stored?.travelRadius ?? trainer.travelRadius ?? ""
      ),
    serviceArea: [...(stored?.serviceArea ?? trainer.serviceArea ?? [])],
    workAddress: stored?.workAddress ?? trainer.workAddress ?? "",
    locationPrecision:
      stored?.locationPrecision === "address" ||
      trainer.locationPrecision === "address"
        ? "address"
        : "zip",
    latitude: stored?.latitude ?? trainer.latitude ?? null,
    longitude: stored?.longitude ?? trainer.longitude ?? null,
    workAddress2: stored?.workAddress2 ?? trainer.workAddress2 ?? "",
    locationPrecision2:
      stored?.locationPrecision2 === "address" ||
      trainer.locationPrecision2 === "address"
        ? "address"
        : "zip",
    city2: stored?.city2 ?? trainer.city2 ?? "",
    neighborhood2: stored?.neighborhood2 ?? trainer.neighborhood2 ?? "",
    zipCode2: stored?.zipCode2 ?? trainer.zipCode2 ?? "",
    latitude2: stored?.latitude2 ?? trainer.latitude2 ?? null,
    longitude2: stored?.longitude2 ?? trainer.longitude2 ?? null,
    ...(() => {
      const range = resolveTrainerSessionPriceRange({
        pricePerSession: stored?.pricePerSession ?? trainer.pricePerSession,
        pricePerSessionMin:
          stored?.pricePerSessionMin ?? trainer.pricePerSessionMin,
        pricePerSessionMax:
          stored?.pricePerSessionMax ?? trainer.pricePerSessionMax,
      });
      const pricingOfferings = parsePricingOfferings(
        stored?.pricingOfferings ?? trainer.pricingOfferings
      );
      return {
        pricingOfferings,
        pricePerSession: range.max,
        pricePerSessionMin: range.min,
        pricePerSessionMax: range.max,
      };
    })(),
    offersFreeFirstSession: normalizeOffersFreeFirstSession(
      stored?.offersFreeFirstSession ?? trainer.offersFreeFirstSession
    ),
    bio: stored?.bio ?? trainer.bio,
    photoNotes:
      stored?.photoNotes?.trim()
        ? stored.photoNotes
        : ((Array.isArray(trainer.galleryImages) ? trainer.galleryImages : [])
            .filter(Boolean)
            .join("\n") || ""),
    slideshowFramesJson:
      stored?.slideshowFramesJson?.trim() ??
      serializeSlideshowFrameMap(trainer.gallerySlideshowFrames ?? {}),
    videoNotes:
      stored?.videoNotes?.trim()
        ? stored.videoNotes
        : (Array.isArray(trainer.gallery) ? trainer.gallery : [])
            .filter((item) => item.type === "video")
            .map((item) => item.src)
            .join("\n"),
    videoPostersJson:
      stored?.videoPostersJson?.trim() ??
      serializeVideoPosterMap(
        Object.fromEntries(
          (Array.isArray(trainer.gallery) ? trainer.gallery : [])
            .filter(
              (item) =>
                item.type === "video" &&
                typeof item.poster === "string" &&
                item.poster.trim()
            )
            .map((item) => [
              item.src,
              {
                posterUrl: item.poster!.trim(),
                duration:
                  typeof item.duration === "number" ? item.duration : 0,
                time: 0,
              },
            ])
        )
      ),
    transformationNotes: stored?.transformationNotes?.trim()
      ? stored.transformationNotes
      : serializeMediaUrlList(
          normalizeTransformationUrls(
            (Array.isArray(trainer.clientTransformations)
              ? trainer.clientTransformations
              : []
            ).map((photo) => photo.src)
          )
        ),
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
      stored?.pinnedPhotos?.length
        ? stored.pinnedPhotos
        : trainer.pinnedPhotos,
      pinAllowList(
        (
          stored?.photoNotes?.trim()
            ? stored.photoNotes
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
            : Array.isArray(trainer.galleryImages)
              ? trainer.galleryImages
              : []
        ).filter(Boolean),
        (
          stored?.videoNotes?.trim()
            ? stored.videoNotes
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
            : (Array.isArray(trainer.gallery) ? trainer.gallery : [])
                .filter((item) => item.type === "video")
                .map((item) => item.src)
        ).filter(Boolean)
      )
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
      stored?.servicesOffered ?? rightFitCopyFromItems(trainer.bestFor),
    profileAccent: style.accent,
    profileAvatarFrame: style.avatarFrame,
    profileNameFont: style.nameFont,
  };
}

export function formToOverrides(form: SpecialistProfileEditForm): SpecialistProfileOverrides {
  const travel = form.travelRadius.trim();
  const radiusMiles = parseTravelRadiusMiles(travel);
  const specialty = sanitizeMarketplaceSpecialties(form.specialty);
  const homepageSpecialties = syncHomepageSpecialties(
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
    trainingOptions: parseTrainingOptions(form.trainingOptions),
    travelToClients: form.travelToClients || undefined,
    travelRadius: travel || undefined,
    serviceRadiusMiles: form.travelToClients === "yes" ? radiusMiles : 0,
    serviceArea: form.serviceArea.map((s) => s.trim()).filter(Boolean),
    workAddress: form.workAddress.trim(),
    locationPrecision: form.locationPrecision,
    ...(form.latitude != null && form.longitude != null
      ? { latitude: form.latitude, longitude: form.longitude }
      : {}),
    workAddress2: form.workAddress2.trim(),
    locationPrecision2: form.locationPrecision2,
    city2: form.city2.trim(),
    neighborhood2: form.neighborhood2.trim(),
    zipCode2: form.zipCode2.trim(),
    ...(form.latitude2 != null && form.longitude2 != null
      ? { latitude2: form.latitude2, longitude2: form.longitude2 }
      : {}),
    ...(() => {
      const offerings = parsePricingOfferings(form.pricingOfferings);
      const range = resolveTrainerSessionPriceRange({
        pricePerSession: form.pricePerSession,
        pricePerSessionMin: form.pricePerSessionMin,
        pricePerSessionMax: form.pricePerSessionMax,
      });
      return {
        pricingOfferings: offerings,
        pricePerSession: range.max,
        pricePerSessionMin: range.min,
        pricePerSessionMax: range.max,
      };
    })(),
    offersFreeFirstSession: normalizeOffersFreeFirstSession(
      form.offersFreeFirstSession
    ),
    bio: form.bio.trim(),
    photoNotes: form.photoNotes.trim(),
    slideshowFramesJson: form.slideshowFramesJson.trim(),
    videoNotes: form.videoNotes.trim(),
    videoPostersJson: serializeVideoPosterMap(
      pruneVideoPosterMap(
        parseVideoPosterMap(form.videoPostersJson ?? ""),
        parseMediaUrlList(form.videoNotes)
      )
    ),
    transformationNotes: form.transformationNotes.trim(),
    bookingAvailability: form.bookingAvailability.trim(),
    profilePhotoUrl: form.profilePhotoUrl.trim(),
    coverImageUrl: form.coverImageUrl.trim(),
    pinnedPhotos: normalizePinnedPhotos(
      form.pinnedPhotos,
      pinAllowList(
        parseMediaUrlList(form.photoNotes),
        parseMediaUrlList(form.videoNotes)
      )
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
    hasSessionPrice(
      resolveTrainerSessionPriceRange({
        pricePerSession: form.pricePerSession,
        pricePerSessionMin: form.pricePerSessionMin,
        pricePerSessionMax: form.pricePerSessionMax,
      })
    ),
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

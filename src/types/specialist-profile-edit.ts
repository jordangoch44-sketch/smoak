import type { Certification, Gender } from "@/types/trainer";
import type { SpecialistServiceType, TravelToClients } from "@/types/specialist-service-area";
import type { SpecialistTrainingOptionId } from "@/types/specialist-training-options";
import type {
  ProfileAccentId,
  ProfileAvatarFrameId,
  ProfileNameFontId,
  SpecialistProfileStyle,
} from "@/lib/specialist-profile-style";

/** DEV ONLY — specialist-editable profile fields (merged onto seed trainer) */
export interface SpecialistProfileOverrides {
  name?: string;
  title?: string;
  gender?: Gender | "";
  profession?: string;
  specialty?: string[];
  /** Up to three specialties shown on marketplace cards */
  homepageSpecialties?: string[];
  certifications?: Certification[];
  city?: string;
  state?: string;
  neighborhood?: string;
  zipCode?: string;
  serviceType?: SpecialistServiceType;
  trainingOptions?: SpecialistTrainingOptionId[];
  travelRadius?: string;
  travelToClients?: TravelToClients;
  serviceRadiusMiles?: number;
  serviceArea?: string[];
  serviceAreaDescription?: string;
  /** Optional precise work address — private; drives lat/lng when pinned */
  workAddress?: string;
  locationPrecision?: "zip" | "address";
  latitude?: number;
  longitude?: number;
  pricePerSession?: number;
  pricePerSessionMin?: number;
  pricePerSessionMax?: number;
  /** Profile toggle — Pro / PRO+ listing perk */
  offersFreeFirstSession?: boolean;
  bio?: string;
  photoNotes?: string;
  /** JSON map of slideshow image URL → { x, y, zoom } framing for hero cover */
  slideshowFramesJson?: string;
  /** Header / gallery videos (PRO+) — uploaded clips, one URL per line */
  videoNotes?: string;
  /** JSON map of video URL → { posterUrl, duration, time } for pin thumbnails */
  videoPostersJson?: string;
  transformationNotes?: string;
  bookingAvailability?: string;
  profilePhotoUrl?: string;
  coverImageUrl?: string;
  /** Pro / trial — up to 3 gallery URLs pinned on the public profile (photos or PRO+ videos) */
  pinnedPhotos?: string[];
  phone?: string;
  email?: string;
  instagram?: string;
  website?: string;
  tiktok?: string;
  googleReviewsUrl?: string;
  googlePlaceId?: string;
  experienceYears?: string;
  trainingStyle?: string;
  servicesOffered?: string;
  /** Curated look: accent, avatar frame, name font */
  profileStyle?: SpecialistProfileStyle;
}

export type SpecialistProfileEditForm = Required<
  Pick<
    SpecialistProfileOverrides,
    | "name"
    | "title"
    | "gender"
    | "profession"
    | "specialty"
    | "homepageSpecialties"
    | "certifications"
    | "city"
    | "neighborhood"
    | "zipCode"
    | "serviceType"
    | "trainingOptions"
    | "travelRadius"
    | "travelToClients"
    | "serviceArea"
    | "workAddress"
    | "locationPrecision"
    | "pricePerSession"
    | "pricePerSessionMin"
    | "pricePerSessionMax"
    | "offersFreeFirstSession"
    | "bio"
    | "photoNotes"
    | "slideshowFramesJson"
    | "videoNotes"
    | "videoPostersJson"
    | "transformationNotes"
    | "bookingAvailability"
    | "profilePhotoUrl"
    | "coverImageUrl"
    | "pinnedPhotos"
    | "phone"
    | "email"
    | "instagram"
    | "website"
    | "tiktok"
    | "googleReviewsUrl"
    | "googlePlaceId"
    | "experienceYears"
    | "trainingStyle"
    | "servicesOffered"
  >
> & {
  profileAccent: ProfileAccentId;
  profileAvatarFrame: ProfileAvatarFrameId;
  profileNameFont: ProfileNameFontId;
  /** Set when pinning an exact address; ZIP centroid when precision is zip */
  latitude: number | null;
  longitude: number | null;
};

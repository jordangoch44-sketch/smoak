import type { Certification, Gender } from "@/types/trainer";
import type { SpecialistServiceType } from "@/types/specialist-service-area";

/** DEV ONLY — specialist-editable profile fields (merged onto seed trainer) */
export interface SpecialistProfileOverrides {
  name?: string;
  title?: string;
  gender?: Gender;
  profession?: string;
  specialty?: string[];
  /** Up to two specialties shown on homepage cards */
  homepageSpecialties?: string[];
  certifications?: Certification[];
  city?: string;
  state?: string;
  neighborhood?: string;
  zipCode?: string;
  serviceType?: SpecialistServiceType;
  travelRadius?: string;
  serviceRadiusMiles?: number;
  serviceArea?: string[];
  serviceAreaDescription?: string;
  latitude?: number;
  longitude?: number;
  pricePerSession?: number;
  bio?: string;
  photoNotes?: string;
  /** Header / gallery video URLs (Pro) — one per line */
  videoNotes?: string;
  transformationNotes?: string;
  bookingAvailability?: string;
  profilePhotoUrl?: string;
  coverImageUrl?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  website?: string;
  tiktok?: string;
  experienceYears?: string;
  trainingStyle?: string;
  servicesOffered?: string;
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
    | "travelRadius"
    | "serviceArea"
    | "pricePerSession"
    | "bio"
    | "photoNotes"
    | "videoNotes"
    | "transformationNotes"
    | "bookingAvailability"
    | "profilePhotoUrl"
    | "coverImageUrl"
    | "phone"
    | "email"
    | "instagram"
    | "website"
    | "tiktok"
    | "experienceYears"
    | "trainingStyle"
    | "servicesOffered"
  >
>;

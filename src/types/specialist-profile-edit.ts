import type { Certification, Gender } from "@/types/trainer";

/** DEV ONLY — specialist-editable profile fields (merged onto seed trainer) */
export interface SpecialistProfileOverrides {
  name?: string;
  title?: string;
  gender?: Gender;
  profession?: string;
  specialty?: string[];
  certifications?: Certification[];
  city?: string;
  neighborhood?: string;
  serviceArea?: string[];
  pricePerSession?: number;
  bio?: string;
  photoNotes?: string;
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
    | "certifications"
    | "city"
    | "neighborhood"
    | "serviceArea"
    | "pricePerSession"
    | "bio"
    | "photoNotes"
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

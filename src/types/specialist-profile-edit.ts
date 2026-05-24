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
  >
>;

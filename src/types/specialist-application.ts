import type { Certification, Gender, SocialLinks } from "@/types/trainer";

export type ProfileStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export interface SpecialistApplicationPricing {
  oneOnOnePrice: string;
  onlineCoachingPrice: string;
  groupTrainingAvailable: boolean;
  freeConsultationAvailable: boolean;
  packageOptions: string;
  sessionDuration: string;
  subscriptionOptions: string;
  introOffer: string;
}

export interface SpecialistApplicationAvailability {
  daysAvailable: string[];
  timeBlocks: string[];
  clientCapacity: string;
  acceptingNewClients: boolean;
}

export interface SpecialistApplicationMedia {
  profilePhotoUrl: string;
  transformationPhotoUrls: string;
  certificationUploadUrls: string;
  trainingVideoUrls: string;
}

export interface SpecialistApplicationSocial extends SocialLinks {
  instagram?: string;
  tiktok?: string;
  website?: string;
  googleReviewsUrl?: string;
}

/** Full specialist onboarding payload — maps to marketplace profile after approval */
export interface SpecialistApplication {
  id: string;
  profileStatus: ProfileStatus;
  email: string;
  password: string;
  submittedAt: string | null;
  updatedAt: string;

  professionalType: string;
  fullName: string;
  displayName: string;
  headline: string;
  phone: string;
  gender: Gender | "";
  yearsExperience: string;
  ageRangesWorkedWith: string[];

  city: string;
  neighborhood: string;
  zipCode: string;
  travelRadius: string;
  inHomeAvailable: boolean;
  onlineCoachingAvailable: boolean;
  gymName: string;
  facilityAddress: string;

  specialties: string[];

  certifications: Certification[];
  collegeAttended: string;
  degree: string;
  cprCertified: boolean;
  insuranceVerified: boolean;

  coachingPhilosophy: string;
  bestClientTypes: string;
  coachingDifferentiator: string;
  communicationStyle: string;
  motivationStyle: string;

  pricing: SpecialistApplicationPricing;
  availability: SpecialistApplicationAvailability;
  social: SpecialistApplicationSocial;
  media: SpecialistApplicationMedia;
  bio: string;
}

export type SpecialistOnboardingState = Omit<
  SpecialistApplication,
  "id" | "profileStatus" | "submittedAt" | "updatedAt"
>;

export const INITIAL_SPECIALIST_ONBOARDING_STATE: SpecialistOnboardingState = {
  email: "",
  password: "",
  professionalType: "",
  fullName: "",
  displayName: "",
  headline: "",
  phone: "",
  gender: "",
  yearsExperience: "",
  ageRangesWorkedWith: [],
  city: "",
  neighborhood: "",
  zipCode: "",
  travelRadius: "",
  inHomeAvailable: false,
  onlineCoachingAvailable: false,
  gymName: "",
  facilityAddress: "",
  specialties: [],
  certifications: [{ name: "", issuer: "", year: new Date().getFullYear() }],
  collegeAttended: "",
  degree: "",
  cprCertified: false,
  insuranceVerified: false,
  coachingPhilosophy: "",
  bestClientTypes: "",
  coachingDifferentiator: "",
  communicationStyle: "",
  motivationStyle: "",
  pricing: {
    oneOnOnePrice: "",
    onlineCoachingPrice: "",
    groupTrainingAvailable: false,
    freeConsultationAvailable: false,
    packageOptions: "",
    sessionDuration: "",
    subscriptionOptions: "",
    introOffer: "",
  },
  availability: {
    daysAvailable: [],
    timeBlocks: [],
    clientCapacity: "",
    acceptingNewClients: true,
  },
  social: {
    instagram: "",
    tiktok: "",
    website: "",
    googleReviewsUrl: "",
  },
  media: {
    profilePhotoUrl: "",
    transformationPhotoUrls: "",
    certificationUploadUrls: "",
    trainingVideoUrls: "",
  },
  bio: "",
};

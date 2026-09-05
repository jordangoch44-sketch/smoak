import type { SpecialistProfileStyle } from "@/lib/specialist-profile-style";
import type { Certification, Gender, SocialLinks } from "@/types/trainer";
import type { SpecialistServiceType, TravelToClients } from "@/types/specialist-service-area";
import type { SpecialistTrainingOptionId } from "@/types/specialist-training-options";

export type ProfileStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED";

export type SpecialistMembershipTier = "free" | "premium";

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

export interface ProfilePhotoCropSettings {
  x: number;
  y: number;
  zoom: number;
  /** Cropped region on the original image (percent), for hero framing without file crop. */
  areaX?: number;
  areaY?: number;
  areaWidth?: number;
  areaHeight?: number;
}

export interface SpecialistApplicationMedia {
  /** Cropped profile photo — submitted to admin / marketplace */
  profilePhotoUrl: string;
  /** Original upload for re-crop during the questionnaire session */
  profilePhotoOriginalUrl: string;
  profilePhotoCrop: ProfilePhotoCropSettings | null;
  transformationPhotoUrls: string;
  certificationUploadUrls: string;
  trainingVideoUrls: string;
  /** JSON map of slideshow image URL → framing { x, y, zoom, area* } */
  slideshowFramesJson?: string;
}

export interface SpecialistApplicationSocial extends SocialLinks {
  instagram?: string;
  tiktok?: string;
  website?: string;
  googleReviewsUrl?: string;
  googlePlaceId?: string;
}

/** Full specialist onboarding payload — maps to marketplace profile after approval */
export interface SpecialistApplication {
  id: string;
  profileStatus: ProfileStatus;
  email: string;
  password: string;
  submittedAt: string | null;
  updatedAt: string;
  /** Supabase auth user id when available */
  userId?: string | null;
  /** Admin note when status is REJECTED — shown to specialist + reject email */
  rejectionReason?: string;

  professionalType: string;
  fullName: string;
  displayName: string;
  headline: string;
  phone: string;
  gender: Gender | "";
  yearsExperience: string;
  ageRangesWorkedWith: string[];

  city: string;
  state: string;
  neighborhood: string;
  zipCode: string;
  serviceType: SpecialistServiceType | "";
  travelRadius: string;
  travelToClients: TravelToClients;
  willingToTravel: boolean;
  serviceAreaZipCodes: string[];
  serviceAreaDescription: string;
  businessName: string;
  membershipTier: SpecialistMembershipTier;
  latitude: number | null;
  longitude: number | null;
  inHomeAvailable: boolean;
  onlineCoachingAvailable: boolean;
  gymName: string;
  /** One-on-one, semi-private, class — shown on the public profile */
  trainingOptions: SpecialistTrainingOptionId[];
  /**
   * Optional street / studio address for precise distance.
   * Not shown on public marketplace cards — lat/lng only.
   */
  facilityAddress: string;
  /** How marketplace distance is resolved — defaults to zip for live profiles */
  locationPrecision?: "zip" | "address";

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
  /** Curated public profile look — set from the dashboard full editor */
  profileStyle?: SpecialistProfileStyle;
  /** Set when applicant entered via /founding-50 invite */
  foundingInvite?: boolean;
  foundingInviteCode?: string;
  foundingInviteAcceptedAt?: string;
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
  state: "",
  neighborhood: "",
  zipCode: "",
  serviceType: "",
  travelRadius: "",
  travelToClients: "",
  willingToTravel: false,
  serviceAreaZipCodes: [],
  serviceAreaDescription: "",
  businessName: "",
  membershipTier: "free",
  latitude: null,
  longitude: null,
  inHomeAvailable: false,
  onlineCoachingAvailable: false,
  gymName: "",
  trainingOptions: ["one-on-one"],
  facilityAddress: "",
  locationPrecision: "zip",
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
    googlePlaceId: "",
  },
  media: {
    profilePhotoUrl: "",
    profilePhotoOriginalUrl: "",
    profilePhotoCrop: null,
    transformationPhotoUrls: "",
    certificationUploadUrls: "",
    trainingVideoUrls: "",
    slideshowFramesJson: "",
  },
  bio: "",
};

export type Gender = "male" | "female" | "non-binary";

/** Tag-style specialties shown on cards and filterable in Explore */
export type Specialty = string;

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface Certification {
  name: string;
  issuer: string;
  year: number;
}

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
}

export interface TrainerMediaItem {
  id: string;
  type: "image" | "video";
  src: string;
  poster?: string;
  alt: string;
}

export interface ClientTransformationPhoto {
  id: string;
  src: string;
  alt: string;
}

/**
 * Marketplace provider record.
 * TODO: Rename type Trainer → Provider and route /trainers → /providers when safe.
 */
export interface Trainer {
  id: string;
  name: string;
  /** Main profession category on cards — one of MAIN_PROFESSION_CATEGORIES */
  profession: string;
  /** Short positioning line on profile */
  title: string;
  /** Display string, e.g. “Mira Mesa, San Diego” — keep in sync with city/neighborhood */
  location: string;
  /** Primary city — aligns with MARKETPLACE_CITIES / provider onboarding */
  city: string;
  /** Primary neighborhood or area within city */
  neighborhood: string;
  /** Additional neighborhoods/areas served (onboarding: multi-select) */
  serviceArea: string[];
  specialty: string[];
  gender: Gender;
  pricePerSession: number;
  rating: number;
  reviewCount: number;
  image: string;
  heroImage: string;
  bio: string;
  bestFor: string[];
  coachingStyle: string[];
  whyClientsChoose: string[];
  resultsSnapshot: string[];
  sessionExperience: string[];
  gallery: TrainerMediaItem[];
  clientTransformations: ClientTransformationPhoto[];
  featured: boolean;
  certifications: Certification[];
  reviews: Review[];
  social: SocialLinks;
}

import type { SpecialistServiceType, TravelToClients } from "@/types/specialist-service-area";
import type { SpecialistTrainingOptionId } from "@/types/specialist-training-options";
import type { SpecialistProfileStyle } from "@/lib/specialist-profile-style";

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
  tiktok?: string;
  /** Google Maps / Business Profile URL (Pro connect — optional). */
  googleReviewsUrl?: string;
  /** Google Places Place ID for review sync (Pro connect — optional). */
  googlePlaceId?: string;
  /** Cached Place Details rating (Pro). */
  googleRating?: number;
  /** Cached Place Details review count (Pro). */
  googleReviewCount?: number;
  /** ISO timestamp of last Places fetch. */
  googleFetchedAt?: string;
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

/** Per-platform review counts — `reviewCount` is derived from these when present */
export interface TrainerReviewSources {
  smoac?: number;
  google?: number;
  yelp?: number;
  other?: number;
}

/**
 * Marketplace provider record.
 * TODO: Rename type Trainer → Provider and route /trainers → /providers when safe.
 */
export interface Trainer {
  id: string;
  name: string;
  /**
   * Personal first name (from onboarding full name / profiles.first_name).
   * Optional so seed/demo rows stay unchanged.
   */
  specialistFirstName?: string;
  /** Main profession category on cards — one of MAIN_PROFESSION_CATEGORIES */
  profession: string;
  /** Short positioning line on profile */
  title: string;
  /** Display string, e.g. “Mira Mesa, San Diego” — keep in sync with city/neighborhood */
  location: string;
  /** Primary city — aligns with MARKETPLACE_CITIES / provider onboarding */
  city: string;
  /** US state abbreviation — from primary ZIP lookup */
  state?: string;
  /** Primary neighborhood or area within city */
  neighborhood: string;
  /** Additional neighborhoods/areas served (onboarding: multi-select) */
  serviceArea: string[];
  /** Extra ZIP codes served — from join application */
  serviceAreaZipCodes?: string[];
  /** Optional free-text service area from join application */
  serviceAreaDescription?: string;
  /** Primary practice ZIP — used for proximity sorting */
  zipCode: string;
  latitude: number;
  longitude: number;
  /**
   * Work / studio / gym address from onboarding. Shown on the Details tab
   * when the specialist opted into a precise pin (`locationPrecision: address`).
   */
  workAddress?: string;
  /** zip = ZIP centroid (default for existing profiles); address = pinned street */
  locationPrecision?: "zip" | "address";
  /** Yes / no / n/a — whether the specialist travels to the client */
  travelToClients?: TravelToClients;
  /** When true, user ZIP within serviceRadiusMiles can match in Explore */
  willingToTravel?: boolean;
  /** How far the specialist typically travels for sessions */
  serviceRadiusMiles?: number;
  /** Stored travel radius option value (e.g. "15", "50+") */
  travelRadius?: string;
  /** In-person, virtual, or both — drives matching */
  serviceType?: SpecialistServiceType;
  /** One-on-one / semi-private / class — public “Training options” */
  trainingOptions?: SpecialistTrainingOptionId[];
  /** Paid placement — stays above organic results when sorting by user ZIP */
  sponsored?: boolean;
  /**
   * Paid category spotlight — prioritized in Explore when browsing matching
   * profession / specialty.
   */
  categorySpotlight?: boolean;
  /** High-trust badge — organic tie-breaker near equal distance */
  verified?: boolean;
  specialty: string[];
  /**
   * Up to two specialties featured on homepage cards.
   * When empty/absent, cards use the first specialties from `specialty`.
   */
  homepageSpecialties?: string[];
  gender: Gender | "";
  pricePerSession: number;
  rating: number;
  /** Sum of `reviewSources` when set; otherwise legacy total */
  reviewCount: number;
  reviewSources?: TrainerReviewSources;
  /** Hero slideshow URLs — falls back to `heroImage` when empty */
  galleryImages: string[];
  /** Per-image hero framing — full photos stay intact for gallery view */
  gallerySlideshowFrames?: Record<
    string,
    { x: number; y: number; zoom: number }
  >;
  /**
   * Pro / trial only — up to 3 gallery URLs pinned under the hero bio.
   * Hidden on public profiles when empty or when not Pro.
   */
  pinnedPhotos?: string[];
  image: string;
  heroImage: string;
  bio: string;
  bestFor: string[];
  coachingStyle: string[];
  whyClientsChoose: string[];
  /** Optional — marketplace / application rows may omit curated result chips */
  resultsSnapshot?: string[] | null;
  sessionExperience: string[];
  gallery: TrainerMediaItem[];
  clientTransformations: ClientTransformationPhoto[];
  featured: boolean;
  /** Admin placement — city/leaderboard emphasis */
  topRanked?: boolean;
  /** Listing entitlement mirror (also on user_roles.is_premium) */
  isPremium?: boolean;
  /**
   * Highest paid membership. Stripe/DB key for Pro Plus is `platinum`.
   * Independent of Boost placement flags.
   */
  membershipPlan?: "free" | "premium" | "platinum";
  /** Curated profile personalization (accent, avatar frame, name font) */
  profileStyle?: SpecialistProfileStyle;
  certifications: Certification[];
  reviews: Review[];
  social: SocialLinks;
}

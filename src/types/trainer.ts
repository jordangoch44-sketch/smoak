export type Gender = "male" | "female" | "non-binary";

export type Specialty =
  | "Strength"
  | "HIIT"
  | "Yoga"
  | "Pilates"
  | "Boxing"
  | "Running"
  | "Nutrition"
  | "Recovery";

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

export interface Trainer {
  id: string;
  name: string;
  title: string;
  location: string;
  city: string;
  specialty: Specialty[];
  gender: Gender;
  pricePerSession: number;
  rating: number;
  reviewCount: number;
  image: string;
  heroImage: string;
  bio: string;
  featured: boolean;
  certifications: Certification[];
  reviews: Review[];
  social: SocialLinks;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface TrainerFilters {
  location: string;
  specialty: string;
  gender: string;
  priceMax: string;
}

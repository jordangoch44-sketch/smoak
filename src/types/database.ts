import type { AppRole } from "@/types/auth-roles";

export interface UserRoleRow {
  user_id: string;
  role: AppRole;
  is_premium: boolean;
  premium_trial_started_at?: string | null;
  premium_trial_ends_at?: string | null;
  premium_trial_ended_notified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  /** Optional display name for chrome / initials. */
  display_name?: string;
  phone?: string;
  /** Public profile photo URL (derived from Storage for avatars bucket). */
  avatar_url?: string;
  /** Stable Storage path in the avatars bucket (not a signed URL). */
  avatar_path?: string;
  client_goals: string[];
  client_city: string;
  client_neighborhood: string;
  client_zip_code: string;
  client_state?: string;
  client_budget: string;
  client_training_style: string;
  /** Preferred search radius in miles. NULL = Automatic. */
  preferred_radius_miles?: number | null;
  preferred_price_min?: number | null;
  preferred_price_max?: number | null;
  preferred_professions?: string[];
  preferred_specialties?: string[];
  preferred_gender?: string;
  preferred_session_format?: string;
  specialist_type: string;
  specialist_city: string;
  specialist_neighborhood: string;
  specialist_format: string;
  specialist_starting_price: string;
  onboarding_data: Record<string, unknown> | null;
  /** incomplete | complete — quick inquiry signup starts incomplete */
  profile_completion_status?: string;
  /** e.g. specialist_inquiry, questionnaire */
  account_source?: string;
  /** pending | complete | skipped — quick OTP signup starts pending */
  password_setup_status?: string;
  created_at: string;
  updated_at: string;
}

export interface SavedTrainerRow {
  user_id: string;
  specialist_id: string;
  created_at: string;
}

export interface ClientApplicationRow {
  id: string;
  user_id: string | null;
  status: string;
  email: string;
  full_name: string;
  phone: string;
  preferred_city: string;
  preferred_neighborhood: string;
  preferred_zip_code: string;
  fitness_goals: string[];
  preferred_specialist_categories: string[];
  budget: string;
  submitted_at: string;
  updated_at: string;
}

export interface SpecialistApplicationRow {
  id: string;
  user_id: string | null;
  profile_status: string;
  email: string;
  application_data: Record<string, unknown>;
  submitted_at: string | null;
  updated_at: string;
}

/** Phase 3c — public marketplace specialist listing */
export interface SpecialistProfileRow {
  id: string;
  user_id: string | null;
  application_id: string | null;
  status: "approved" | "hidden" | "archived" | string;
  display_name: string;
  profession: string;
  city: string;
  state: string;
  neighborhood: string;
  zip_code: string;
  latitude: number | null;
  longitude: number | null;
  specialty: string[] | unknown;
  price_per_session: number;
  service_type: string | null;
  featured: boolean;
  sponsored: boolean;
  top_ranked: boolean;
  category_spotlight: boolean;
  is_premium: boolean;
  verified: boolean;
  rating: number;
  review_count: number;
  profile_data: Record<string, unknown>;
  overrides: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

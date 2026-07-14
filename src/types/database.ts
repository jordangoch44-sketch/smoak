import type { AppRole } from "@/types/auth-roles";

export interface UserRoleRow {
  user_id: string;
  role: AppRole;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  /** Public profile photo URL (or data URL until Storage is wired). */
  avatar_url?: string;
  client_goals: string[];
  client_city: string;
  client_neighborhood: string;
  client_zip_code: string;
  client_budget: string;
  client_training_style: string;
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

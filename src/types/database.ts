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
  created_at: string;
  updated_at: string;
}

export interface SavedTrainerRow {
  user_id: string;
  specialist_id: string;
  created_at: string;
}

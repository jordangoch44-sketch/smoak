/** Admin-facing specialist visibility (maps to explore + profile later) */
export type AdminSpecialistVisibility = "active" | "hidden" | "pending";

/** Per-specialist admin flags — persisted for Supabase migration */
export interface AdminSpecialistMeta {
  visibility?: AdminSpecialistVisibility;
  featured?: boolean;
  topRanked?: boolean;
  isPremium?: boolean;
  /** Admin-edited basics (merged with seed / overrides on publish) */
  profession?: string;
  specialty?: string[];
  city?: string;
  neighborhood?: string;
}

export type AdminApplicationStatusLabel = "pending" | "approved" | "rejected";

export interface AdminClientRecord {
  id: string;
  email: string;
  displayName: string;
  status: "active" | "inactive";
  savedSpecialistsCount: number;
  source: "dev-account" | "signup-draft" | "mock";
}

export interface AdminOverviewStats {
  totalSpecialists: number;
  pendingApplications: number;
  activeSpecialists: number;
  premiumSpecialists: number;
  totalClients: number;
  savedSpecialistActivityPlaceholder: string;
}

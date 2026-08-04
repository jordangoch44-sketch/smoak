/** Admin-facing specialist visibility (maps to explore + profile later) */
export type AdminSpecialistVisibility =
  | "active"
  | "hidden"
  | "pending"
  | "suspended";

/** Per-specialist admin flags — persisted for Supabase migration */
export interface AdminSpecialistMeta {
  visibility?: AdminSpecialistVisibility;
  featured?: boolean;
  sponsored?: boolean;
  topRanked?: boolean;
  isPremium?: boolean;
  /** Protect from test cleanup / bulk delete tools */
  isProtected?: boolean;
  /** Distinguish owner/real accounts from filler test data */
  accountKind?: "real" | "test";
  /** Admin-edited basics (merged with seed / overrides on publish) */
  profession?: string;
  specialty?: string[];
  city?: string;
  state?: string;
  neighborhood?: string;
  zipCode?: string;
  serviceType?: "in-person" | "virtual" | "both";
  travelRadius?: string;
}

export type AdminApplicationStatusLabel =
  | "pending"
  | "approved"
  | "rejected"
  | "archived";

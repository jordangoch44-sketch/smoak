/**
 * localStorage keys for marketplace data still on Phase 3 local persistence.
 * Auth session keys: see auth-session-storage.ts (dev fallback when Supabase off).
 */
export const DEV_AUTH_STORAGE_KEY = "smoac_dev_auth";
/** Company portal session — owner / staff / internal employees */
export const INTERNAL_AUTH_STORAGE_KEY = "smoac_internal_auth";
export const DEV_CREATE_ACCOUNT_PROFILE_KEY = "smoac_create_account_profile";
export const DEV_SPECIALIST_APPLICATIONS_KEY = "smoac_specialist_applications";
export const DEV_CLIENT_APPLICATIONS_KEY = "smoac_client_applications";
export const DEV_APPROVED_SPECIALIST_PROFILES_KEY =
  "smoac_approved_specialist_profiles";
export const DEV_SPECIALIST_ONBOARDING_DRAFT_KEY = "smoac_specialist_onboarding_draft";
/** @deprecated Global key — migrated to per-user `smoac_saved_specialists_${userId}` */
export const DEV_SAVED_SPECIALISTS_KEY = "smoac_saved_specialists";
export const DEV_HIDDEN_SPECIALISTS_KEY = "smoac_hidden_specialists";
/** DEV — admin specialist flags (visibility, featured, top ranked, premium) */
export const DEV_ADMIN_SPECIALIST_META_KEY = "smoac_admin_specialist_meta";
export const DEV_ADMIN_NOTIFICATION_DISMISSED_KEY =
  "smoac_admin_notification_dismissed";
export const DEV_PENDING_SAVE_KEY = "smoac_pending_save";

/** @deprecated DEV migration source */
export const LEGACY_AUTH_STORAGE_KEY = "smoac-auth-session";
/** @deprecated DEV migration source */
export const LEGACY_SAVED_SPECIALISTS_KEY = "smoac:saved-trainer-ids";

export interface PendingSaveRecord {
  specialistId: string;
  createdAt: string;
}

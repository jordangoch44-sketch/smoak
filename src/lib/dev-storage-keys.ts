/**
 * DEV ONLY — localStorage keys for auth, saves, and pending-save workflow.
 * Remove when real authentication and account-backed saves ship.
 */
export const DEV_AUTH_STORAGE_KEY = "smoac_dev_auth";
export const DEV_CREATE_ACCOUNT_PROFILE_KEY = "smoac_create_account_profile";
export const DEV_SPECIALIST_APPLICATIONS_KEY = "smoac_specialist_applications";
export const DEV_SPECIALIST_ONBOARDING_DRAFT_KEY = "smoac_specialist_onboarding_draft";
/** @deprecated Global key — migrated to per-user `smoac_saved_specialists_${userId}` */
export const DEV_SAVED_SPECIALISTS_KEY = "smoac_saved_specialists";
export const DEV_HIDDEN_SPECIALISTS_KEY = "smoac_hidden_specialists";
/** DEV — admin specialist flags (visibility, featured, top ranked, premium) */
export const DEV_ADMIN_SPECIALIST_META_KEY = "smoac_admin_specialist_meta";
export const DEV_ADMIN_NOTIFICATION_DISMISSED_KEY =
  "smoac_admin_notification_dismissed";
export const DEV_PENDING_SAVE_KEY = "smoac_pending_save";

/** Homepage location personalization (geo / ZIP / skip) */
export const USER_LATITUDE_KEY = "userLatitude";
export const USER_LONGITUDE_KEY = "userLongitude";
export const HAS_LOCATION_PERMISSION_KEY = "hasLocationPermission";
export const USER_ZIP_CODE_KEY = "userZipCode";
export const HAS_SKIPPED_LOCATION_PROMPT_KEY = "hasSkippedLocationPrompt";

/** @deprecated DEV migration source */
export const LEGACY_AUTH_STORAGE_KEY = "smoac-auth-session";
/** @deprecated DEV migration source */
export const LEGACY_SAVED_SPECIALISTS_KEY = "smoac:saved-trainer-ids";

export interface PendingSaveRecord {
  specialistId: string;
  createdAt: string;
}

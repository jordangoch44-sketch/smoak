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
/** Admin nav badges — item IDs last seen when a section tab was opened */
export const DEV_ADMIN_SECTION_BADGE_SEEN_KEY =
  "smoac_admin_section_badge_seen";
/** Admin email catalog — automated + one-time templates (framework, not live send) */
export const DEV_ADMIN_EMAIL_CATALOG_KEY = "smoac_admin_email_catalog";
export const DEV_PENDING_SAVE_KEY = "smoac_pending_save";
/** Survives email-confirm gap before profiles/roles can be written */
export const DEV_PENDING_MARKETPLACE_SIGNUP_KEY =
  "smoac_pending_marketplace_signup";
/** Once-per-browser marker so client welcome email isn’t double-sent */
export const CLIENT_WELCOME_EMAIL_SENT_PREFIX = "smoac_client_welcome_sent:";
/** Once-per-specialist first-live-profile welcome (after approval) */
export const SPECIALIST_PROFILE_WELCOME_SEEN_PREFIX =
  "smoac_specialist_profile_welcome_seen:";
/** Local fallback inbox when Supabase inquiry tables are unavailable */
export const LOCAL_INQUIRIES_STORAGE_KEY = "smoac_local_inquiries";
/** Specialist portal inquiry alerts (local + same-browser notify) */
export const SPECIALIST_INQUIRY_NOTIFICATIONS_KEY =
  "smoac_specialist_inquiry_notifications";
/** Explore search history (write-only until recent-search chips ship) */
export { RECENT_SEARCHES_STORAGE_KEY } from "@/lib/recent-searches-storage";

/** @deprecated DEV migration source */
export const LEGACY_AUTH_STORAGE_KEY = "smoac-auth-session";
/** @deprecated DEV migration source */
export const LEGACY_SAVED_SPECIALISTS_KEY = "smoac:saved-trainer-ids";

export interface PendingSaveRecord {
  specialistId: string;
  specialistName?: string;
  profilePath?: string;
  actionType?: "save_specialist";
  createdAt: string;
}

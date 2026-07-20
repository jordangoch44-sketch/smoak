/**
 * Optional barrel — prefer direct imports: `@/lib/supabase/client`, `@/lib/supabase/config`.
 */
export {
  SPECIALIST_MEDIA_BUCKET,
  SPECIALIST_STORAGE_ACCEPT,
  SPECIALIST_STORAGE_LIMITS,
  SPECIALIST_STORAGE_PREFIX,
} from "@/lib/supabase/constants";
export {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
  isSupabaseConfigured,
  requireSupabasePublicConfig,
} from "@/lib/supabase/config";
export {
  SpecialistStorageValidationError,
  SupabaseNotConfiguredError,
} from "@/lib/supabase/errors";
export { createSupabaseBrowserClient } from "@/lib/supabase/client";
export { createSupabaseServerClient } from "@/lib/supabase/server";
export {
  assertSupabaseReady,
  getSpecialistMediaPublicUrl,
  removeSpecialistMedia,
  removeSpecialistMediaObject,
  uploadSpecialistMedia,
} from "@/lib/supabase/storage";
export {
  buildSpecialistStoragePath,
  parseSpecialistIdFromStoragePath,
} from "@/lib/supabase/storage-paths";

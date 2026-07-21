/**
 * Optional barrel — prefer direct imports: `@/lib/supabase/client`, `@/lib/supabase/config`.
 */
export {
  SPECIALIST_MEDIA_BUCKET,
  SPECIALIST_STORAGE_ACCEPT,
  SPECIALIST_STORAGE_LIMITS,
} from "@/lib/supabase/constants";
export {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
export { SpecialistStorageValidationError } from "@/lib/supabase/errors";
export { createSupabaseBrowserClient } from "@/lib/supabase/client";
export { createSupabaseServerClient } from "@/lib/supabase/server";

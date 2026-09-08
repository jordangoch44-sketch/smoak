import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Inquiry/review notify runs on the sender's session. Clients cannot read
 * another user's `profiles.email` or `specialist_applications` under RLS, so
 * lookups must use the service role when it is configured.
 */
function notifyLookupClient(userClient: SupabaseClient): SupabaseClient {
  return createSupabaseServiceClient() ?? userClient;
}

function asEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : null;
}

export async function resolveSpecialistUserId(
  supabase: SupabaseClient,
  specialistId: string
): Promise<string | null> {
  const db = notifyLookupClient(supabase);

  const { data: application } = await db
    .from("specialist_applications")
    .select("user_id")
    .eq("id", specialistId)
    .maybeSingle();

  const fromApp = application?.user_id;
  if (typeof fromApp === "string" && fromApp.trim()) {
    return fromApp.trim();
  }

  const { data: profile } = await db
    .from("specialist_profiles")
    .select("user_id")
    .eq("id", specialistId)
    .maybeSingle();

  const fromProfile = profile?.user_id;
  return typeof fromProfile === "string" && fromProfile.trim()
    ? fromProfile.trim()
    : null;
}

/** Resolve specialist inbox for transactional notifications (inquiry, review, etc.). */
export async function resolveSpecialistNotifyEmail(
  supabase: SupabaseClient,
  specialistId: string,
  specialistUserId: string | null
): Promise<string | null> {
  const db = notifyLookupClient(supabase);
  const service = createSupabaseServiceClient();

  if (specialistUserId) {
    const { data: profile } = await db
      .from("profiles")
      .select("email")
      .eq("user_id", specialistUserId)
      .maybeSingle();
    const fromProfile = asEmail(profile?.email);
    if (fromProfile) return fromProfile;

    if (service) {
      const { data: authUser } = await service.auth.admin.getUserById(
        specialistUserId
      );
      const fromAuth = asEmail(authUser.user?.email);
      if (fromAuth) return fromAuth;
    }
  }

  const { data: application } = await db
    .from("specialist_applications")
    .select("email")
    .eq("id", specialistId)
    .maybeSingle();

  const fromApplication = asEmail(application?.email);
  if (fromApplication) return fromApplication;

  const { data: listing } = await db
    .from("specialist_profiles")
    .select("profile_data")
    .eq("id", specialistId)
    .maybeSingle();

  const listingEmail =
    listing &&
    typeof listing === "object" &&
    listing.profile_data &&
    typeof listing.profile_data === "object" &&
    "email" in (listing.profile_data as object)
      ? asEmail((listing.profile_data as { email?: string }).email)
      : null;

  return listingEmail;
}

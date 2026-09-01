import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveSpecialistUserId(
  supabase: SupabaseClient,
  specialistId: string
): Promise<string | null> {
  const { data: application } = await supabase
    .from("specialist_applications")
    .select("user_id")
    .eq("id", specialistId)
    .maybeSingle();

  const fromApp = application?.user_id;
  if (typeof fromApp === "string" && fromApp.trim()) {
    return fromApp.trim();
  }

  const { data: profile } = await supabase
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
  if (specialistUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", specialistUserId)
      .maybeSingle();
    if (typeof profile?.email === "string" && profile.email.trim()) {
      return profile.email.trim().toLowerCase();
    }
  }

  const { data: application } = await supabase
    .from("specialist_applications")
    .select("email")
    .eq("id", specialistId)
    .maybeSingle();

  if (typeof application?.email === "string" && application.email.trim()) {
    return application.email.trim().toLowerCase();
  }

  const { data: listing } = await supabase
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
      ? String((listing.profile_data as { email?: string }).email ?? "").trim()
      : "";

  return listingEmail.includes("@") ? listingEmail.toLowerCase() : null;
}

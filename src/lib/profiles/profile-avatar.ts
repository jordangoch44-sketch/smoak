import type { ProfileRow } from "@/types/database";

/** Resolve display avatar from profiles.avatar_url or specialist onboarding media. */
export function resolveAvatarUrlFromProfile(
  profile: ProfileRow | null | undefined
): string | undefined {
  if (!profile) return undefined;

  const direct = profile.avatar_url?.trim() ?? "";
  if (direct) return direct;

  const onboarding = profile.onboarding_data;
  if (!onboarding || typeof onboarding !== "object") return undefined;

  const media = (onboarding as { media?: { profilePhotoUrl?: unknown } }).media;
  const photo =
    typeof media?.profilePhotoUrl === "string"
      ? media.profilePhotoUrl.trim()
      : "";
  return photo || undefined;
}

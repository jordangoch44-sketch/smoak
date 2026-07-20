import type { ProfileRow } from "@/types/database";

const AVATARS_BUCKET = "avatars";

function publicUrlFromAvatarPath(path: string): string | undefined {
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!base) return undefined;
  return `${base}/storage/v1/object/public/${AVATARS_BUCKET}/${trimmed.replace(/^\//, "")}`;
}

/** Resolve display avatar from profiles.avatar_url, avatar_path, or onboarding media. */
export function resolveAvatarUrlFromProfile(
  profile: ProfileRow | null | undefined
): string | undefined {
  if (!profile) return undefined;

  const direct = profile.avatar_url?.trim() ?? "";
  if (direct && !direct.toLowerCase().startsWith("data:")) return direct;

  const fromPath = publicUrlFromAvatarPath(profile.avatar_path ?? "");
  if (fromPath) return fromPath;

  const onboarding = profile.onboarding_data;
  if (!onboarding || typeof onboarding !== "object") return undefined;

  const media = (onboarding as { media?: { profilePhotoUrl?: unknown } }).media;
  const photo =
    typeof media?.profilePhotoUrl === "string"
      ? media.profilePhotoUrl.trim()
      : "";
  if (photo && !photo.toLowerCase().startsWith("data:")) return photo;
  return undefined;
}

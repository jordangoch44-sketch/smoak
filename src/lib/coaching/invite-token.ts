/** Stored on the auth user at join-page signup so email confirm can still claim. */
export const COACHING_INVITE_TOKEN_META = "coaching_invite_token";

/** Token from `/join/<token>` or `/auth/callback?next=/join/<token>`. */
export function coachingInviteTokenFromNextPath(nextPath: string): string | null {
  const path = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  const pathname = path.split("?")[0] ?? path;
  const match = /^\/join\/([^/]+)$/.exec(pathname);
  if (!match?.[1]) return null;
  try {
    const token = decodeURIComponent(match[1]).trim();
    return token || null;
  } catch {
    return match[1].trim() || null;
  }
}

export function readCoachingInviteToken(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>)[COACHING_INVITE_TOKEN_META];
  if (typeof raw !== "string") return null;
  const token = raw.trim();
  return token || null;
}

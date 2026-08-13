/**
 * Normalize specialist Instagram field → openable profile URL.
 * Accepts full URLs, @handles, or bare usernames. Returns null if empty / placeholder.
 */
export function resolveInstagramProfileUrl(
  raw: string | null | undefined
): string | null {
  const value = raw?.trim() ?? "";
  if (!value || value === "#" || value === "/") return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (!/instagram\.com$/i.test(url.hostname.replace(/^www\./i, ""))) {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  }

  const handle = value.replace(/^@+/, "").replace(/^\/+/, "").split(/[/?#]/)[0];
  if (!handle || !/^[A-Za-z0-9._]{1,30}$/.test(handle)) return null;
  return `https://www.instagram.com/${handle}/`;
}

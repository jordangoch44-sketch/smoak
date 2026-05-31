import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";

const RECENT_ZIPS_KEY = "smoacRecentZipCodes";
const MAX_RECENT = 5;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_ZIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeZipCode(String(item)))
      .filter((zip) => isValidZipCode(zip));
  } catch {
    return [];
  }
}

export function getRecentZipCodes(): string[] {
  return readRecent();
}

export function recordRecentZipCode(zip: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeZipCode(zip);
  if (!isValidZipCode(normalized)) return;
  const next = [
    normalized,
    ...readRecent().filter((item) => item !== normalized),
  ].slice(0, MAX_RECENT);
  window.localStorage.setItem(RECENT_ZIPS_KEY, JSON.stringify(next));
}

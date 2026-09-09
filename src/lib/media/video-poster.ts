import { normalizeSlideshowImageKey } from "@/lib/media/slideshow-frame";

export interface VideoPosterEntry {
  posterUrl: string;
  duration: number;
  time: number;
}

export type VideoPosterMap = Record<string, VideoPosterEntry>;

function isPosterEntry(value: unknown): value is VideoPosterEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as VideoPosterEntry;
  return (
    typeof entry.posterUrl === "string" &&
    entry.posterUrl.trim().length > 0 &&
    typeof entry.duration === "number" &&
    Number.isFinite(entry.duration)
  );
}

export function parseVideoPosterMap(json: string): VideoPosterMap {
  const trimmed = json.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const next: VideoPosterMap = {};
    for (const [url, entry] of Object.entries(parsed)) {
      if (!url.trim() || !isPosterEntry(entry)) continue;
      const key = normalizeSlideshowImageKey(url);
      if (!key) continue;
      next[key] = {
        posterUrl: entry.posterUrl.trim(),
        duration: Math.max(0, entry.duration),
        time: typeof entry.time === "number" ? Math.max(0, entry.time) : 0,
      };
    }
    return next;
  } catch {
    return {};
  }
}

export function serializeVideoPosterMap(map: VideoPosterMap): string {
  const entries = Object.entries(map).filter(
    ([url, entry]) => url.trim() && entry.posterUrl.trim()
  );
  if (entries.length === 0) return "";
  return JSON.stringify(
    Object.fromEntries(
      entries.map(([url, entry]) => [normalizeSlideshowImageKey(url), entry])
    )
  );
}

export function pruneVideoPosterMap(
  map: VideoPosterMap,
  activeUrls: string[]
): VideoPosterMap {
  const active = new Set(
    activeUrls.map((url) => normalizeSlideshowImageKey(url)).filter(Boolean)
  );
  const next: VideoPosterMap = {};
  for (const [url, entry] of Object.entries(map)) {
    const key = normalizeSlideshowImageKey(url);
    if (active.has(key)) next[key] = entry;
  }
  return next;
}

export function resolveVideoPoster(
  map: VideoPosterMap,
  url: string
): VideoPosterEntry | undefined {
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (map[trimmed]) return map[trimmed];
  const normalized = normalizeSlideshowImageKey(trimmed);
  if (map[normalized]) return map[normalized];
  for (const [key, entry] of Object.entries(map)) {
    if (normalizeSlideshowImageKey(key) === normalized) return entry;
  }
  return undefined;
}

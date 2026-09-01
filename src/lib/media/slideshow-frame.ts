import type { CSSProperties } from "react";
import type { ProfilePhotoCropSettings } from "@/types/specialist-application";

export type SlideshowFrameMap = Record<string, ProfilePhotoCropSettings>;

const DEFAULT_FRAME: ProfilePhotoCropSettings = { x: 0, y: 0, zoom: 1 };

function isFrame(value: unknown): value is ProfilePhotoCropSettings {
  if (!value || typeof value !== "object") return false;
  const frame = value as ProfilePhotoCropSettings;
  return (
    typeof frame.x === "number" &&
    typeof frame.y === "number" &&
    typeof frame.zoom === "number"
  );
}

/** Strip cache-busting query params so frame keys match across saves. */
export function normalizeSlideshowImageKey(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  }
}

export function parseSlideshowFrameMap(json: string): SlideshowFrameMap {
  const trimmed = json.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const next: SlideshowFrameMap = {};
    for (const [url, frame] of Object.entries(parsed)) {
      if (!url.trim() || !isFrame(frame)) continue;
      const key = normalizeSlideshowImageKey(url);
      if (!key) continue;
      next[key] = {
        x: frame.x,
        y: frame.y,
        zoom: Math.min(3, Math.max(1, frame.zoom)),
        ...(typeof frame.areaX === "number" ? { areaX: frame.areaX } : {}),
        ...(typeof frame.areaY === "number" ? { areaY: frame.areaY } : {}),
        ...(typeof frame.areaWidth === "number"
          ? { areaWidth: frame.areaWidth }
          : {}),
        ...(typeof frame.areaHeight === "number"
          ? { areaHeight: frame.areaHeight }
          : {}),
      };
    }
    return next;
  } catch {
    return {};
  }
}

export function serializeSlideshowFrameMap(map: SlideshowFrameMap): string {
  const entries = Object.entries(map).filter(([url]) => url.trim());
  if (entries.length === 0) return "";
  return JSON.stringify(
    Object.fromEntries(
      entries.map(([url, frame]) => [normalizeSlideshowImageKey(url), frame])
    )
  );
}

export function pruneSlideshowFrameMap(
  map: SlideshowFrameMap,
  activeUrls: string[]
): SlideshowFrameMap {
  const active = new Set(
    activeUrls.map((url) => normalizeSlideshowImageKey(url)).filter(Boolean)
  );
  const next: SlideshowFrameMap = {};
  for (const [url, frame] of Object.entries(map)) {
    const key = normalizeSlideshowImageKey(url);
    if (active.has(key)) next[key] = frame;
  }
  return next;
}

export function resolveSlideshowFrame(
  map: SlideshowFrameMap,
  url: string
): ProfilePhotoCropSettings {
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_FRAME;
  if (map[trimmed]) return map[trimmed];
  const normalized = normalizeSlideshowImageKey(trimmed);
  if (map[normalized]) return map[normalized];
  for (const [key, frame] of Object.entries(map)) {
    if (normalizeSlideshowImageKey(key) === normalized) return frame;
  }
  return DEFAULT_FRAME;
}

/** Apply saved framing to a full-bleed hero cover image (no destructive crop). */
export function slideshowFrameToImageStyle(
  frame: ProfilePhotoCropSettings | undefined
): CSSProperties {
  if (!frame) {
    return { objectPosition: "50% 18%" };
  }

  if (
    typeof frame.areaX === "number" &&
    typeof frame.areaY === "number" &&
    typeof frame.areaWidth === "number" &&
    typeof frame.areaHeight === "number" &&
    frame.areaWidth > 0 &&
    frame.areaHeight > 0
  ) {
    const focalX = frame.areaX + frame.areaWidth / 2;
    const focalY = frame.areaY + frame.areaHeight / 2;
    return {
      objectPosition: `${focalX}% ${focalY}%`,
    };
  }

  const x = 50 - frame.x / 2;
  const y = 50 - frame.y / 2;
  const scale = frame.zoom > 1 ? frame.zoom : 1;

  return {
    objectPosition: `${x}% ${y}%`,
    transform: scale > 1 ? `scale(${scale})` : undefined,
    transformOrigin: `${x}% ${y}%`,
  };
}

export function parseGallerySlideshowFrames(
  value: unknown
): SlideshowFrameMap | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const next: SlideshowFrameMap = {};
  for (const [url, frame] of Object.entries(value)) {
    if (!isFrame(frame)) continue;
    const key = normalizeSlideshowImageKey(url);
    if (!key) continue;
    next[key] = frame;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

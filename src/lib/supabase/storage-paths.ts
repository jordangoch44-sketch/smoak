import { SPECIALIST_STORAGE_PREFIX } from "@/lib/supabase/constants";
import type { SpecialistStorageMediaKind } from "@/types/supabase-storage";

const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,127}$/i;
const SAFE_FILE = /^[a-z0-9][a-z0-9._-]{0,255}$/i;

function assertSafeSegment(value: string, label: string): string {
  const trimmed = value.trim();
  if (!SAFE_ID.test(trimmed)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return trimmed;
}

function assertSafeFileName(fileName: string): string {
  const base = fileName.split("/").pop()?.split("\\").pop()?.trim() ?? "";
  if (!SAFE_FILE.test(base)) {
    throw new Error(`Invalid file name: ${fileName}`);
  }
  return base;
}

/**
 * Object path inside `specialist-media`:
 * `{specialistId}/profile/avatar.webp`
 * `{specialistId}/cover/hero.webp`
 * `{specialistId}/gallery/{assetId}/image.webp`
 * `{specialistId}/gallery/{assetId}/video.mp4`
 * `{specialistId}/gallery/{assetId}/poster.webp`
 */
export function buildSpecialistStoragePath(
  specialistId: string,
  kind: SpecialistStorageMediaKind,
  fileName: string,
  assetId?: string
): string {
  const id = assertSafeSegment(specialistId, "specialistId");
  const file = assertSafeFileName(fileName);

  switch (kind) {
    case "profile":
      return `${id}/${SPECIALIST_STORAGE_PREFIX.profile}/${file}`;
    case "cover":
      return `${id}/${SPECIALIST_STORAGE_PREFIX.cover}/${file}`;
    case "gallery-image":
    case "gallery-video":
    case "gallery-video-poster": {
      const galleryId = assertSafeSegment(assetId ?? "", "assetId");
      const suffix =
        kind === "gallery-image"
          ? "image"
          : kind === "gallery-video"
            ? "video"
            : "poster";
      return `${id}/${SPECIALIST_STORAGE_PREFIX.gallery}/${galleryId}/${suffix}-${file}`;
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function parseSpecialistIdFromStoragePath(path: string): string | null {
  const segment = path.split("/")[0];
  return segment && SAFE_ID.test(segment) ? segment : null;
}

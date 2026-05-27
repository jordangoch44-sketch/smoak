import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SPECIALIST_MEDIA_BUCKET,
  SPECIALIST_STORAGE_LIMITS,
} from "@/lib/supabase/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  SpecialistStorageValidationError,
  SupabaseNotConfiguredError,
} from "@/lib/supabase/errors";
import { buildSpecialistStoragePath } from "@/lib/supabase/storage-paths";
import type {
  SpecialistStorageMediaKind,
  SpecialistStorageObjectRef,
  SpecialistStorageUploadOptions,
  SpecialistStorageUploadResult,
} from "@/types/supabase-storage";

function maxBytesForKind(kind: SpecialistStorageMediaKind): number {
  switch (kind) {
    case "profile":
      return SPECIALIST_STORAGE_LIMITS.profile;
    case "cover":
      return SPECIALIST_STORAGE_LIMITS.cover;
    case "gallery-image":
      return SPECIALIST_STORAGE_LIMITS.galleryImage;
    case "gallery-video":
      return SPECIALIST_STORAGE_LIMITS.galleryVideo;
    case "gallery-video-poster":
      return SPECIALIST_STORAGE_LIMITS.galleryVideoPoster;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function validateUpload(options: SpecialistStorageUploadOptions): string {
  const { specialistId, kind, file, fileName, assetId } = options;

  if (!specialistId.trim()) {
    throw new SpecialistStorageValidationError("specialistId is required");
  }

  if (
    kind.startsWith("gallery") &&
    (!assetId || !assetId.trim())
  ) {
    throw new SpecialistStorageValidationError(
      "assetId is required for gallery uploads"
    );
  }

  const size = file.size;
  const max = maxBytesForKind(kind);
  if (size > max) {
    throw new SpecialistStorageValidationError(
      `File exceeds ${Math.round(max / (1024 * 1024))}MB limit for ${kind}`
    );
  }

  return buildSpecialistStoragePath(specialistId, kind, fileName, assetId);
}

export function getSpecialistMediaPublicUrl(
  client: SupabaseClient,
  path: string
): string {
  const { data } = client.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

/** Upload specialist media — wire from dashboard upload fields later. */
export async function uploadSpecialistMedia(
  client: SupabaseClient,
  options: SpecialistStorageUploadOptions
): Promise<SpecialistStorageUploadResult> {
  const path = validateUpload(options);
  const contentType =
    options.contentType ??
    (options.file instanceof File ? options.file.type : undefined);

  const { error } = await client.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .upload(path, options.file, {
      contentType: contentType || undefined,
      upsert: options.upsert ?? true,
      cacheControl: "3600",
    });

  if (error) {
    throw error;
  }

  return {
    bucket: SPECIALIST_MEDIA_BUCKET,
    path,
    publicUrl: getSpecialistMediaPublicUrl(client, path),
  };
}

export async function removeSpecialistMedia(
  client: SupabaseClient,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return;

  const { error } = await client.storage
    .from(SPECIALIST_MEDIA_BUCKET)
    .remove(paths);

  if (error) {
    throw error;
  }
}

export async function removeSpecialistMediaObject(
  client: SupabaseClient,
  ref: SpecialistStorageObjectRef
): Promise<void> {
  if (ref.bucket !== SPECIALIST_MEDIA_BUCKET) {
    throw new SpecialistStorageValidationError(
      `Unexpected bucket: ${ref.bucket}`
    );
  }
  await removeSpecialistMedia(client, [ref.path]);
}

/** Guard for future upload UI — app keeps working without Supabase in dev. */
export function assertSupabaseReady(): void {
  if (!isSupabaseConfigured()) {
    throw new SupabaseNotConfiguredError();
  }
}

/** Specialist-owned media stored in Supabase Storage */
export type SpecialistStorageMediaKind =
  | "profile"
  | "cover"
  | "gallery-image"
  | "gallery-video"
  | "gallery-video-poster";

export interface SpecialistStorageUploadOptions {
  specialistId: string;
  kind: SpecialistStorageMediaKind;
  /** Stable id for gallery rows, e.g. `g1` — omit for profile/cover */
  assetId?: string;
  file: File | Blob;
  fileName: string;
  contentType?: string;
  /** Replace existing object at the same path */
  upsert?: boolean;
}

export interface SpecialistStorageUploadResult {
  bucket: string;
  path: string;
  publicUrl: string;
}

export interface SpecialistStorageObjectRef {
  bucket: string;
  path: string;
}

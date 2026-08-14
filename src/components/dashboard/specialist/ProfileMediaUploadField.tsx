"use client";

import { useId, useState, type ChangeEvent } from "react";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { prepareImageDataUrlForUpload } from "@/lib/media/crop-image";
import {
  SPECIALIST_STORAGE_ACCEPT,
  SPECIALIST_STORAGE_LIMITS,
} from "@/lib/supabase/constants";
import { SpecialistStorageValidationError } from "@/lib/supabase/errors";
import { cn } from "@/lib/utils";
import type { SpecialistStorageMediaKind } from "@/types/supabase-storage";

interface ProfileMediaUploadFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  aspect?: "cover" | "square";
  accept?: string;
  /** When set with Supabase configured, uploads to specialist-media bucket */
  specialistId?: string | null;
  mediaKind?: Extract<
    SpecialistStorageMediaKind,
    "profile" | "cover" | "gallery-image"
  >;
  onClear?: () => void;
}

function maxBytesForUiKind(
  kind: ProfileMediaUploadFieldProps["mediaKind"]
): number {
  if (kind === "cover") return SPECIALIST_STORAGE_LIMITS.cover;
  if (kind === "gallery-image") return SPECIALIST_STORAGE_LIMITS.galleryImage;
  return SPECIALIST_STORAGE_LIMITS.profile;
}

function rejectUnsupportedPhonePhoto(file: File): string | null {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  if (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  ) {
    return "Use JPEG or PNG (on iPhone: Format → Most Compatible).";
  }
  return null;
}

function compressKindFor(
  mediaKind: ProfileMediaUploadFieldProps["mediaKind"]
): "profile" | "cover" | "gallery" {
  if (mediaKind === "cover") return "cover";
  if (mediaKind === "gallery-image") return "gallery";
  return "profile";
}

export function ProfileMediaUploadField({
  label,
  hint,
  value,
  onChange,
  aspect = "cover",
  accept,
  specialistId,
  mediaKind = "profile",
  onClear,
}: ProfileMediaUploadFieldProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const resolvedAccept =
    accept ??
    (mediaKind === "gallery-image"
      ? SPECIALIST_STORAGE_ACCEPT.galleryImage
      : mediaKind === "cover"
        ? SPECIALIST_STORAGE_ACCEPT.cover
        : SPECIALIST_STORAGE_ACCEPT.profile);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const phoneReject = rejectUnsupportedPhonePhoto(file);
      if (phoneReject) {
        throw new SpecialistStorageValidationError(phoneReject);
      }

      const maxBytes = maxBytesForUiKind(mediaKind);
      if (file.size > maxBytes) {
        throw new SpecialistStorageValidationError(
          `Image must be under ${Math.round(maxBytes / (1024 * 1024))}MB.`
        );
      }

      const dataUrl = await prepareImageDataUrlForUpload(
        file,
        compressKindFor(mediaKind)
      );

      const useStorage =
        Boolean(specialistId?.trim()) &&
        isMarketplaceSupabaseActive() &&
        (mediaKind === "profile" ||
          mediaKind === "cover" ||
          mediaKind === "gallery-image");

      if (useStorage) {
        /* Server route uploads with the service role — storage RLS on the
         * live project does not allow direct client uploads. */
        const id = specialistId!.trim();
        const stamp = Date.now().toString(36);
        const basePath =
          mediaKind === "profile"
            ? `${id}/profile/avatar-${stamp}`
            : mediaKind === "cover"
              ? `${id}/cover/hero-${stamp}`
              : `${id}/gallery/g-${stamp}/image`;
        const response = await fetch("/api/media/specialist-application", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: basePath, dataUrl }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok: boolean; publicUrl?: string; message?: string }
          | null;
        if (!response.ok || !payload?.ok || !payload.publicUrl) {
          throw new Error(
            payload?.message ??
              (response.status === 413
                ? "Photo is too large to upload."
                : "Could not upload image. Try again.")
          );
        }
        /* Unique object path + cache-bust so img/CDN don't keep the old avatar. */
        const publicUrl = payload.publicUrl.includes("?")
          ? `${payload.publicUrl}&v=${stamp}`
          : `${payload.publicUrl}?v=${stamp}`;
        onChange(publicUrl);
        return;
      }

      onChange(dataUrl);
    } catch (error) {
      const message =
        error instanceof SpecialistStorageValidationError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not upload image. Try again.";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="dashboard-upload-field">
      <span className="login-field__label" id={`${inputId}-label`}>
        {label}
      </span>
      <label
        htmlFor={inputId}
        className={cn(
          "dashboard-upload-zone",
          aspect === "square" && "dashboard-upload-zone--square",
          value && "dashboard-upload-zone--has-preview",
          uploading && "dashboard-upload-zone--busy"
        )}
        aria-labelledby={`${inputId}-label`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="dashboard-upload-zone__preview"
            onError={(event) => {
              event.currentTarget.style.opacity = "0.35";
            }}
          />
        ) : (
          <>
            <span className="dashboard-upload-zone__icon" aria-hidden>
              +
            </span>
            {hint ? (
              <span className="dashboard-upload-zone__hint">
                {uploading ? "Uploading…" : hint}
              </span>
            ) : null}
          </>
        )}
        <span className="dashboard-upload-zone__overlay">
          {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
        </span>
        <input
          id={inputId}
          type="file"
          accept={`${resolvedAccept},.jpg,.jpeg,.png,.webp`}
          className="dashboard-upload-zone__input"
          onChange={(event) => void handleFileChange(event)}
          disabled={uploading}
        />
      </label>
      {value && onClear ? (
        <button
          type="button"
          className="dashboard-upload-clear"
          onClick={onClear}
        >
          Remove
        </button>
      ) : null}
      {uploadError ? (
        <p className="dashboard-upload-error" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useId, useState, type ChangeEvent } from "react";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { readFileAsDataUrl } from "@/lib/media/crop-image";
import {
  ProfilePhotoCropper,
  GALLERY_ASPECT_PRESETS,
} from "@/components/media/ProfilePhotoCropper";
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
  const [pendingCropSrc, setPendingCropSrc] = useState<string | null>(null);

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

      const rawDataUrl = await readFileAsDataUrl(file);
      setPendingCropSrc(rawDataUrl);
    } catch (error) {
      const message =
        error instanceof SpecialistStorageValidationError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not read image.";
      setUploadError(message);
    }
  }

  async function handleCropSave(croppedImageDataUrl: string) {
    setUploading(true);
    setUploadError(null);
    try {
      const useStorage =
        Boolean(specialistId?.trim()) &&
        isMarketplaceSupabaseActive() &&
        (mediaKind === "profile" ||
          mediaKind === "cover" ||
          mediaKind === "gallery-image");

      if (useStorage) {
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
          body: JSON.stringify({ path: basePath, dataUrl: croppedImageDataUrl }),
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
        const publicUrl = payload.publicUrl.includes("?")
          ? `${payload.publicUrl}&v=${stamp}`
          : `${payload.publicUrl}?v=${stamp}`;
        onChange(publicUrl);
      } else {
        onChange(croppedImageDataUrl);
      }
      setPendingCropSrc(null);
    } catch (error) {
      const message =
        error instanceof SpecialistStorageValidationError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not upload image. Try again.";
      setUploadError(message);
      throw error;
    } finally {
      setUploading(false);
    }
  }

  const isSquare = aspect === "square" || mediaKind === "profile";

  return (
    <div className="dashboard-upload-field">
      <span className="login-field__label" id={`${inputId}-label`}>
        {label}
      </span>
      <label
        htmlFor={inputId}
        className={cn(
          "dashboard-upload-zone",
          isSquare && "dashboard-upload-zone--square",
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

      {value ? (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.375rem" }}>
          <button
            type="button"
            className="smoac-control"
            style={{
              padding: "0.25rem 0.65rem",
              fontSize: "0.75rem",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.07)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "rgba(255, 255, 255, 0.85)",
              cursor: "pointer",
            }}
            onClick={() => setPendingCropSrc(value)}
            disabled={uploading}
          >
            Adjust crop
          </button>
          {onClear ? (
            <button
              type="button"
              className="dashboard-upload-clear"
              onClick={onClear}
              disabled={uploading}
            >
              Remove
            </button>
          ) : null}
        </div>
      ) : null}

      {uploadError ? (
        <p className="dashboard-upload-error" role="alert">
          {uploadError}
        </p>
      ) : null}

      {pendingCropSrc ? (
        <ProfilePhotoCropper
          imageSrc={pendingCropSrc}
          aspect={isSquare ? 1 : 16 / 9}
          cropShape={isSquare ? "round" : "rect"}
          showAspectPresets={false}
          title={isSquare ? "Adjust Profile Picture" : "Frame Cover Photo"}
          lead={
            isSquare
              ? "Drag to reposition. Pinch or use the zoom slider. The circle shows your avatar preview."
              : "Drag to reposition, zoom, or rotate your photo to fit the header slideshow."
          }
          confirmLabel="Use photo"
          confirmingLabel="Uploading…"
          onCancel={() => setPendingCropSrc(null)}
          onSave={handleCropSave}
        />
      ) : null}
    </div>
  );
}

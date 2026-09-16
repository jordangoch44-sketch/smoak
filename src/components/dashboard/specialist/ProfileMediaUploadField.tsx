"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { ProfilePhotoCropper } from "@/components/media/ProfilePhotoCropper";
import { prepareImageDataUrlForUpload } from "@/lib/media/crop-image";
import {
  rejectUnsupportedPhonePhoto,
  uploadSpecialistDashboardMedia,
} from "@/lib/media/specialist-media-upload";
import {
  SPECIALIST_STORAGE_ACCEPT,
  SPECIALIST_STORAGE_LIMITS,
} from "@/lib/supabase/constants";
import { SpecialistStorageValidationError } from "@/lib/supabase/errors";
import { CameraIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface ProfileMediaUploadFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  accept?: string;
  specialistId?: string | null;
}

export function ProfileMediaUploadField({
  label,
  hint,
  value,
  onChange,
  accept = SPECIALIST_STORAGE_ACCEPT.profile,
  specialistId,
}: ProfileMediaUploadFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingCropSrc, setPendingCropSrc] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    try {
      const phoneReject = rejectUnsupportedPhonePhoto(file);
      if (phoneReject) {
        throw new SpecialistStorageValidationError(phoneReject);
      }

      const maxBytes = SPECIALIST_STORAGE_LIMITS.profile;
      if (file.size > maxBytes) {
        throw new SpecialistStorageValidationError(
          `Image must be under ${Math.round(maxBytes / (1024 * 1024))}MB.`
        );
      }

      setPendingCropSrc(await prepareImageDataUrlForUpload(file, "profile"));
    } catch (error) {
      const message =
        error instanceof SpecialistStorageValidationError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not read image.";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCropSave(croppedImageDataUrl: string) {
    setUploading(true);
    setUploadError(null);
    try {
      const publicUrl = await uploadSpecialistDashboardMedia(
        specialistId,
        croppedImageDataUrl,
        "profile"
      );
      onChange(publicUrl);
      setPendingCropSrc(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not upload image. Try again.";
      setUploadError(message);
      throw error;
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
          "dashboard-upload-zone--square",
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
          {uploading ? (
            "Uploading…"
          ) : value ? (
            <>
              <CameraIcon className="dashboard-upload-zone__overlay-icon" />
              Replace photo
            </>
          ) : (
            "Upload photo"
          )}
        </span>
        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept={`${accept},.jpg,.jpeg,.png,.webp`}
          className="dashboard-upload-zone__input"
          onChange={(event) => void handleFileChange(event)}
          disabled={uploading}
        />
      </label>

      {value ? (
        <div className="dashboard-upload-actions">
          <button
            type="button"
            className="dashboard-upload-action dashboard-upload-action--primary smoac-control"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <CameraIcon className="dashboard-upload-action__icon" />
            Replace photo
          </button>
          <button
            type="button"
            className="dashboard-upload-action smoac-control"
            onClick={() => setPendingCropSrc(value)}
            disabled={uploading}
          >
            Adjust crop
          </button>
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
          aspect={1}
          cropShape="round"
          title="Adjust Profile Picture"
          lead="Drag to reposition. Pinch or use the zoom slider. The circle shows your avatar preview."
          confirmLabel="Use photo"
          confirmingLabel="Uploading…"
          onCancel={() => setPendingCropSrc(null)}
          onSave={handleCropSave}
        />
      ) : null}
    </div>
  );
}

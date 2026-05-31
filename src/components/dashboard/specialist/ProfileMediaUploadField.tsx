"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { readFileAsDataUrl } from "@/lib/media/crop-image";
import { cn } from "@/lib/utils";

interface ProfileMediaUploadFieldProps {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  aspect?: "cover" | "square";
  accept?: string;
}

export function ProfileMediaUploadField({
  label,
  hint,
  value,
  onChange,
  aspect = "cover",
  accept = "image/*",
}: ProfileMediaUploadFieldProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onChange(dataUrl);
    } catch {
      setUploadError("Could not read image. Try again or paste a URL.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="dashboard-upload-field">
      <span className="login-field__label">{label}</span>
      <button
        type="button"
        className={cn(
          "dashboard-upload-zone",
          aspect === "square" && "dashboard-upload-zone--square",
          value && "dashboard-upload-zone--has-preview"
        )}
        onClick={() => fileRef.current?.click()}
        aria-labelledby={inputId}
        disabled={uploading}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="dashboard-upload-zone__preview"
          />
        ) : (
          <>
            <span className="dashboard-upload-zone__icon" aria-hidden>
              +
            </span>
            <span className="dashboard-upload-zone__hint">
              {uploading ? "Processing image…" : hint}
            </span>
          </>
        )}
        <span className="dashboard-upload-zone__overlay">
          {uploading ? "Processing…" : value ? "Replace image" : "Tap to upload"}
        </span>
      </button>
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept={accept}
        className="dashboard-upload-zone__input"
        onChange={(event) => void handleFileChange(event)}
        tabIndex={-1}
      />
      <label className="login-field dashboard-upload-field__url">
        <span className="login-field__label">Image URL</span>
        <input
          className="login-field__input profile-edit-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://… or upload above"
        />
      </label>
      {uploadError ? (
        <p className="dashboard-edit-hint" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}

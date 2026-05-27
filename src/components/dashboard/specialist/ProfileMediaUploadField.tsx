"use client";

import { useId, useRef, type ChangeEvent } from "react";
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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    onChange(previewUrl);
    event.target.value = "";
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
            <span className="dashboard-upload-zone__hint">{hint}</span>
          </>
        )}
        <span className="dashboard-upload-zone__overlay">
          {value ? "Replace image" : "Tap to upload"}
        </span>
      </button>
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept={accept}
        className="dashboard-upload-zone__input"
        onChange={handleFileChange}
        tabIndex={-1}
      />
      <label className="login-field dashboard-upload-field__url">
        <span className="login-field__label">Image URL</span>
        <input
          className="login-field__input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://…"
        />
      </label>
    </div>
  );
}

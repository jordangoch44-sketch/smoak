"use client";

import { useId, useState, type ChangeEvent } from "react";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { readFileAsDataUrl } from "@/lib/media/crop-image";
import {
  CLIENT_TRANSFORMATIONS_MAX,
  normalizeTransformationUrls,
  parseMediaUrlList,
  serializeMediaUrlList,
} from "@/lib/specialist-media-limits";
import { SPECIALIST_STORAGE_ACCEPT } from "@/lib/supabase/constants";
import { LockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface SpecialistTransformationsEditorProps {
  transformationNotes: string;
  isProPlus: boolean;
  specialistId?: string | null;
  onUpgrade?: () => void;
  onChange: (transformationNotes: string) => void;
}

async function uploadTransformationDataUrl(
  specialistId: string | null | undefined,
  dataUrl: string
): Promise<string> {
  const id = specialistId?.trim();
  if (!id || !isMarketplaceSupabaseActive()) return dataUrl;

  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const basePath = `${id}/gallery/transformation/t-${stamp}/image`;
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
    throw new Error(payload?.message ?? "Could not upload image.");
  }
  return payload.publicUrl.includes("?")
    ? `${payload.publicUrl}&v=${stamp}`
    : `${payload.publicUrl}?v=${stamp}`;
}

export function SpecialistTransformationsEditor({
  transformationNotes,
  isProPlus,
  specialistId,
  onUpgrade,
  onChange,
}: SpecialistTransformationsEditorProps) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urls = normalizeTransformationUrls(parseMediaUrlList(transformationNotes));
  const atLimit = urls.length >= CLIENT_TRANSFORMATIONS_MAX;

  function setUrls(next: string[]) {
    onChange(serializeMediaUrlList(normalizeTransformationUrls(next)));
  }

  async function handleAdd(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    event.target.value = "";
    if (!fileList || fileList.length === 0 || !isProPlus) return;

    const remaining = CLIENT_TRANSFORMATIONS_MAX - urls.length;
    const files = Array.from(fileList).slice(0, remaining);
    setBusy(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        uploaded.push(await uploadTransformationDataUrl(specialistId, dataUrl));
      }
      setUrls([...urls, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add photos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "specialist-media-editor__pins",
        !isProPlus && "specialist-media-editor__feature--locked"
      )}
    >
      <div className="specialist-media-editor__label-row">
        <p className="login-field__label">
          Client transformations · {urls.length}/{CLIENT_TRANSFORMATIONS_MAX}
        </p>
        {!isProPlus ? (
          <LockIcon className="specialist-media-editor__label-lock" />
        ) : null}
      </div>
      <p className="specialist-media-editor__hint">
        Shows in a carousel under pinned photos on your public profile.
      </p>
      {urls.length > 0 ? (
        <div
          className="specialist-media-editor__pin-row"
          aria-label="Transformation photos"
        >
          {urls.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              className="specialist-media-editor__pin-tile"
              onClick={() => {
                if (!isProPlus) {
                  onUpgrade?.();
                  return;
                }
                setUrls(urls.filter((_, i) => i !== index));
              }}
              aria-label={
                isProPlus
                  ? `Remove transformation ${index + 1}`
                  : "Unlock transformations with Pro Plus"
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
              <span className="specialist-media-editor__pin-index">
                {index + 1}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {!atLimit ? (
        isProPlus ? (
          <label
            htmlFor={inputId}
            className={cn(
              "smoac-control specialist-media-editor__add",
              busy && "specialist-media-editor__add--busy"
            )}
          >
            <span aria-hidden>+</span>
            <span>{busy ? "Uploading…" : "Add transformations"}</span>
          </label>
        ) : (
          <button
            type="button"
            className="smoac-control specialist-media-editor__add specialist-media-editor__add--locked"
            onClick={() => onUpgrade?.()}
          >
            <LockIcon className="specialist-media-editor__add-lock" />
            <span>Add transformations</span>
          </button>
        )
      ) : null}
      {isProPlus ? (
        <input
          id={inputId}
          type="file"
          multiple
          accept={`${SPECIALIST_STORAGE_ACCEPT.galleryImage},.jpg,.jpeg,.png,.webp`}
          className="dashboard-upload-zone__input"
          onChange={(event) => void handleAdd(event)}
          disabled={busy || atLimit}
        />
      ) : (
        <button
          type="button"
          className="smoac-control specialist-media-editor__lock-cta"
          onClick={() => onUpgrade?.()}
        >
          <LockIcon className="specialist-media-editor__lock-cta-icon" />
          Unlock with Pro Plus
        </button>
      )}
      {error ? (
        <p className="dashboard-upload-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

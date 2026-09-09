"use client";

import { useState, type ChangeEvent } from "react";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { prepareImageDataUrlForUpload } from "@/lib/media/crop-image";
import {
  CLIENT_TRANSFORMATIONS_MAX,
  normalizeTransformationUrls,
  parseMediaUrlList,
  serializeMediaUrlList,
} from "@/lib/specialist-media-limits";
import { LockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface SpecialistTransformationsEditorProps {
  transformationNotes: string;
  isProPlus: boolean;
  specialistId?: string | null;
  onUpgrade?: () => void;
  onChange: (transformationNotes: string) => void;
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
    throw new Error(
      payload?.message ??
        (response.status === 413
          ? "Photo is too large to upload."
          : "Could not upload image.")
    );
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
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urls = normalizeTransformationUrls(parseMediaUrlList(transformationNotes));
  const atLimit = urls.length >= CLIENT_TRANSFORMATIONS_MAX;

  function setUrls(next: string[]) {
    onChange(serializeMediaUrlList(normalizeTransformationUrls(next)));
  }

  async function handleAdd(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    event.target.value = "";
    if (!fileList || fileList.length === 0 || !isProPlus || atLimit) return;

    const remaining = CLIENT_TRANSFORMATIONS_MAX - urls.length;
    const files = Array.from(fileList).slice(0, remaining);
    setBusy(true);
    setError(null);
    setProgress(null);
    let lastError: string | null = null;
    try {
      const uploaded: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const phoneReject = rejectUnsupportedPhonePhoto(file);
        if (phoneReject) {
          lastError = phoneReject;
          continue;
        }
        if (files.length > 1) {
          setProgress(`${index + 1}/${files.length}`);
        }
        const dataUrl = await prepareImageDataUrlForUpload(file, "gallery");
        uploaded.push(await uploadTransformationDataUrl(specialistId, dataUrl));
      }
      if (uploaded.length > 0) {
        setUrls([...urls, ...uploaded]);
      } else {
        setError(lastError ?? "Could not add photos.");
      }
      if (fileList.length > remaining) {
        setError(
          `Selected ${fileList.length} photos; only ${remaining} more allowed.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add photos.");
    } finally {
      setBusy(false);
      setProgress(null);
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
        Multi-select photos. They appear under pinned photos on your public
        profile.
      </p>
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
                : "Unlock transformations with PRO+"
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" />
            <span className="specialist-media-editor__pin-index">
              {index + 1}
            </span>
          </button>
        ))}
        {!atLimit ? (
          isProPlus ? (
            <label
              htmlFor="specialist-transformation-upload"
              className={cn(
                "smoac-control specialist-media-editor__pin-tile specialist-media-editor__pin-tile--add",
                busy && "specialist-media-editor__pin-tile--busy"
              )}
            >
              <input
                id="specialist-transformation-upload"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/*,.jpg,.jpeg,.png,.webp"
                className="specialist-media-editor__pin-file"
                onChange={(event) => void handleAdd(event)}
                disabled={busy}
                aria-label="Add transformation photos"
              />
              <span aria-hidden>+</span>
              <span>{busy ? progress ?? "Uploading…" : "Add"}</span>
            </label>
          ) : (
            <button
              type="button"
              className="smoac-control specialist-media-editor__pin-tile specialist-media-editor__pin-tile--add specialist-media-editor__pin-tile--locked"
              onClick={() => onUpgrade?.()}
              aria-label="Unlock transformations with PRO+"
            >
              <LockIcon className="specialist-media-editor__add-lock" />
              <span>Add</span>
            </button>
          )
        ) : null}
      </div>
      {error ? (
        <p className="dashboard-upload-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

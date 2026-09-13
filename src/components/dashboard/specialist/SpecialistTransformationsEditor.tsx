"use client";

import { useId, useState, type ChangeEvent } from "react";
import { prepareImageDataUrlForUpload } from "@/lib/media/crop-image";
import {
  rejectUnsupportedPhonePhoto,
  uploadSpecialistDashboardMedia,
} from "@/lib/media/specialist-media-upload";
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

export function SpecialistTransformationsEditor({
  transformationNotes,
  isProPlus,
  specialistId,
  onUpgrade,
  onChange,
}: SpecialistTransformationsEditorProps) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urls = normalizeTransformationUrls(parseMediaUrlList(transformationNotes));
  const atLimit = urls.length >= CLIENT_TRANSFORMATIONS_MAX;

  function setUrls(next: string[]) {
    onChange(serializeMediaUrlList(normalizeTransformationUrls(next)));
  }

  async function handleAdd(event: ChangeEvent<HTMLInputElement>) {
    /* Snapshot first — FileList is live and empties when value is cleared. */
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0 || !isProPlus || atLimit) return;

    const remaining = CLIENT_TRANSFORMATIONS_MAX - urls.length;
    const files = selected.slice(0, remaining);
    setBusy(true);
    setError(null);
    setProgress(null);
    try {
      const uploaded: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const phoneReject = rejectUnsupportedPhonePhoto(file);
        if (phoneReject) {
          throw new Error(phoneReject);
        }
        if (files.length > 1) {
          setProgress(`${index + 1}/${files.length}`);
        }
        const dataUrl = await prepareImageDataUrlForUpload(file, "gallery");
        uploaded.push(
          await uploadSpecialistDashboardMedia(
            specialistId,
            dataUrl,
            "transformation"
          )
        );
      }
      if (uploaded.length > 0) {
        setUrls([...urls, ...uploaded]);
      } else {
        setError("Could not add photos.");
      }
      if (selected.length > remaining) {
        setError(
          `Selected ${selected.length} photos; only ${remaining} more allowed.`
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
          Client results · {urls.length}/{CLIENT_TRANSFORMATIONS_MAX}
        </p>
        {!isProPlus ? (
          <LockIcon className="specialist-media-editor__label-lock" />
        ) : null}
      </div>
      <p className="specialist-media-editor__hint">
        Multi-select photos. They appear as a slider under Specialties on your
        public profile.
      </p>
      <div
        className="specialist-media-editor__pin-row"
        aria-label="Client result photos"
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
                ? `Remove client result ${index + 1}`
                : "Unlock client results with PRO+"
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
              className={cn(
                "smoac-control specialist-media-editor__pin-tile specialist-media-editor__pin-tile--add",
                busy && "specialist-media-editor__pin-tile--busy"
              )}
            >
              <span aria-hidden>+</span>
              <span>{busy ? progress ?? "Uploading…" : "Add"}</span>
              <input
                id={inputId}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="specialist-media-editor__pin-file"
                onChange={(event) => void handleAdd(event)}
                disabled={busy}
              />
            </label>
          ) : (
            <button
              type="button"
              className="smoac-control specialist-media-editor__pin-tile specialist-media-editor__pin-tile--add specialist-media-editor__pin-tile--locked"
              onClick={() => onUpgrade?.()}
              aria-label="Unlock client results with PRO+"
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

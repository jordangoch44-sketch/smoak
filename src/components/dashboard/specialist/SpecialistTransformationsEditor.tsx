"use client";

import { useId, useState, type ChangeEvent } from "react";
import { ProfilePhotoCropper } from "@/components/media/ProfilePhotoCropper";
import { usePhotoGridDrag } from "@/hooks/usePhotoGridDrag";
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
import { CloseIcon, LockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/** Matches the client results slider on the public profile. */
const CLIENT_RESULT_ASPECT = 5 / 4;

interface CropQueueItem {
  dataUrl: string;
  replaceIndex?: number;
}

interface CropQueueState {
  items: CropQueueItem[];
  currentIndex: number;
}

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
  const [error, setError] = useState<string | null>(null);
  const [cropQueue, setCropQueue] = useState<CropQueueState | null>(null);
  const urls = normalizeTransformationUrls(parseMediaUrlList(transformationNotes));
  const atLimit = urls.length >= CLIENT_TRANSFORMATIONS_MAX;
  const canReorder = isProPlus && urls.length > 1;

  function setUrls(next: string[]) {
    onChange(serializeMediaUrlList(normalizeTransformationUrls(next)));
  }

  const drag = usePhotoGridDrag(urls, canReorder, setUrls);

  async function handleAdd(event: ChangeEvent<HTMLInputElement>) {
    /* Snapshot first — FileList is live and empties when value is cleared. */
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0 || !isProPlus || atLimit) return;

    const remaining = CLIENT_TRANSFORMATIONS_MAX - urls.length;
    const files = selected.slice(0, remaining);
    if (selected.length > remaining) {
      setError(
        `Selected ${selected.length} photos; only ${remaining} more allowed.`
      );
    } else {
      setError(null);
    }

    setBusy(true);
    try {
      const items: CropQueueItem[] = [];
      for (const file of files) {
        const phoneReject = rejectUnsupportedPhonePhoto(file);
        if (phoneReject) {
          setError(phoneReject);
          continue;
        }
        try {
          items.push({
            dataUrl: await prepareImageDataUrlForUpload(file, "gallery"),
          });
        } catch {
          setError("Could not read one of the selected photos.");
        }
      }
      if (items.length === 0) return;
      setCropQueue({ items, currentIndex: 0 });
    } finally {
      setBusy(false);
    }
  }

  function editCrop(index: number) {
    const url = urls[index];
    if (!url || !isProPlus) {
      onUpgrade?.();
      return;
    }
    setCropQueue({
      items: [{ dataUrl: url, replaceIndex: index }],
      currentIndex: 0,
    });
  }

  async function handleCropSave(
    imageData: string,
    _crop?: unknown,
    _area?: unknown,
    _rotation?: unknown,
    reportProgress?: (percent: number) => void
  ) {
    if (!cropQueue) return;
    const current = cropQueue.items[cropQueue.currentIndex];
    if (!current) return;

    const uploadedUrl = await uploadSpecialistDashboardMedia(
      specialistId,
      imageData,
      "transformation",
      reportProgress
    );

    if (current.replaceIndex != null) {
      const next = [...urls];
      next[current.replaceIndex] = uploadedUrl;
      setUrls(next);
      setCropQueue(null);
      return;
    }

    setUrls([...urls, uploadedUrl]);
    if (cropQueue.currentIndex < cropQueue.items.length - 1) {
      setCropQueue({
        ...cropQueue,
        currentIndex: cropQueue.currentIndex + 1,
      });
      return;
    }
    setCropQueue(null);
  }

  const currentCrop =
    cropQueue && cropQueue.items[cropQueue.currentIndex]
      ? cropQueue.items[cropQueue.currentIndex]
      : null;

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
        {isProPlus
          ? "Crop each photo as you add it. Drag to reorder."
          : urls.length > 0
            ? "Saved from PRO+. Clients cannot see these until you restore PRO+."
            : "Multi-select photos. Crop each one, then the next opens."}
      </p>
      <div
        ref={drag.rowRef}
        className="specialist-media-editor__pin-row"
        aria-label="Client result photos"
      >
        {urls.map((url, index) => (
          <div
            key={url}
            className={cn(
              "specialist-transforms-editor__tile",
              canReorder && "specialist-transforms-editor__tile--sortable",
              drag.draggingUrl === url && "specialist-transforms-editor__tile--dragging"
            )}
            data-result-index={index}
          >
            <button
              type="button"
              className="smoac-control specialist-media-editor__pin-tile"
              onPointerDown={(event) => drag.onPointerDown(event, url)}
              onPointerMove={drag.onPointerMove}
              onPointerUp={drag.endDrag}
              onPointerCancel={drag.endDrag}
              onContextMenu={(event) => event.preventDefault()}
              onDragStart={(event) => event.preventDefault()}
              onClick={() => {
                if (drag.consumeSuppressedClick()) return;
                editCrop(index);
              }}
              aria-label={
                isProPlus
                  ? `Edit crop for client result ${index + 1}. Drag to reorder.`
                  : "Unlock client results with PRO+"
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" draggable={false} />
              <span className="specialist-media-editor__pin-index">
                {index + 1}
              </span>
            </button>
            {isProPlus ? (
              <button
                type="button"
                className="smoac-control specialist-transforms-editor__remove"
                aria-label={`Remove client result ${index + 1}`}
                onClick={() => setUrls(urls.filter((_, i) => i !== index))}
              >
                <CloseIcon className="specialist-transforms-editor__remove-icon" />
              </button>
            ) : null}
          </div>
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
              <span>{busy ? "Preparing…" : "Add"}</span>
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

      {drag.ghost}

      {currentCrop ? (
        <ProfilePhotoCropper
          imageSrc={currentCrop.dataUrl}
          aspect={CLIENT_RESULT_ASPECT}
          cropShape="rect"
          title="Frame client result"
          lead="Drag and zoom so this photo fits the client results slider."
          stepBadge={
            cropQueue && cropQueue.items.length > 1
              ? `Photo ${cropQueue.currentIndex + 1} of ${cropQueue.items.length}`
              : undefined
          }
          confirmLabel={
            currentCrop.replaceIndex != null
              ? "Save"
              : cropQueue &&
                  cropQueue.currentIndex < cropQueue.items.length - 1
                ? "Save & Next →"
                : "Add photo"
          }
          confirmingLabel="Saving…"
          onCancel={() => setCropQueue(null)}
          onSave={handleCropSave}
        />
      ) : null}
    </div>
  );
}
